/*
 * Copyright 2014, Timothy Rochford
 */
"use_strict";

var amqp = require('amqplib/callback_api'),
    mongojs = require('./mongo.js')
 , common = require('./../common.js');

function bail(err, conn) {
    console.error(err);
    if (conn) conn.close(function() { process.exit(1); });
}
function on_connect(err, conn) {
    if (err !== null) return bail(err);
    process.once('SIGINT', function() { conn.close(); });
    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        ch.assertQueue(common.qOutput, {durable: true}, function(err, _ok) {
            ch.consume(common.qOutput, doWork, {noAck: false});
            console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });
        function doWork(msg) {
            var data = JSON.parse(msg.content.toString());
            console.log(data);
            mongojs.db.sentiment.insert(data, function(err) {
	            ch.ack(msg);
	    });
        }
    });
}
mongojs.init(function(x) { amqp.connect(on_connect); });
