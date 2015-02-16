/*
 * Copyright 2014, Timothy Rochford
 */
"use strict";

var sentiment = require('sentiment')
      , _ = require('underscore')
      , amqp = require('amqplib/callback_api')
      , common = require('./../common.js');

var symbols = _.map(common.marketStocks, function(stock) { return stock.symbol} );

var channelInput = null, connectionInput = null;
var channelOutput = null, connectionOutput = null;

function bail(err, conn) {
    console.error(err);
    if (conn) conn.close(function() { process.exit(1); });
}
function on_connectInputQueue(err, conn) {
    if (err !== null) return bail(err);
    connectionInput = conn;
    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        channelInput = ch;
        ch.assertQueue(common.qInput, {durable: true}, function(err, _ok) {
            ch.consume(common.qInput, doWork, {noAck: false});
            console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });
        function doWork(msg) {
            var data = JSON.parse(msg.content.toString());
            console.log(data);
            // data.text = tweet.text;
            var result = sentiment(data.text);
            data.score = result.score;
            delete data.text;
            channelOutput.sendToQueue(common.qOutput, new Buffer(JSON.stringify(data)), {persistent: true});
            ch.ack(msg);
        }
    });
}

function on_connectOutputQueue(err, conn) {
    if (err !== null) return bail(err);
    connectionOutput = conn;
    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        channelOutput = ch;
        ch.assertQueue(common.qOutput, {durable: true}, function(err, _ok) {
            if (err !== null) return bail(err, conn);
            amqp.connect(on_connectInputQueue);
        });
    });
}
amqp.connect(on_connectOutputQueue);

var gracefulShutdown = function() {
    console.log("Received kill signal, shutting down gracefully.");
    channelOutput.close(function() {
        connectionOutput.close();
        process.exit();
    });
    channelInput.close(function() {
        connectionInput.close();
        process.exit();
    });
}

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', gracefulShutdown);
