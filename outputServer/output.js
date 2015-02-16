/*
 * Copyright 2014, Timothy Rochford
 */
"use_strict";

var amqp = require('amqplib/callback_api')
  , mongojs = require('./mongo.js')
  , common = require('./../common.js');

var channel = null, connection = null;

function bail(err, conn) {
    console.error(err);
    if (conn) conn.close(function() { process.exit(1); });
}
function on_connect(err, conn) {
    if (err !== null) return bail(err);
    connection = conn;
    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        channel = ch;
        ch.assertQueue(common.qOutput, {durable: true}, function(err, _ok) {
            ch.consume(common.qOutput, doWork, {noAck: false});
            console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });
        function doWork(msg) {
            var data = JSON.parse(msg.content.toString());
            console.log(data);
            mongojs.db.sentiment.update({twitter_id: data.twitter_id},
                                        {twitter_id: data.twitter_id,
                                         symbols: data.symbols,
                                         score: data.score},
                                        {upsert: true},function(err) {
                ch.ack(msg);
        });
        }
    });
}
mongojs.init(function(x) { amqp.connect(on_connect); });

var gracefulShutdown = function() {
    console.log("Received kill signal, shutting down gracefully.");
    channel.close(function() {
        connection.close();
        process.exit();
    });
}

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', gracefulShutdown);
