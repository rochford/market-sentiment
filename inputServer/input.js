/*
 * Copyright 2014, Timothy Rochford
 */
"use strict";

var twitter = require('ntwitter')
      , _ = require('underscore')
      , amqp = require('amqplib/callback_api')
      , common = require('./../common.js');

var client = new twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var symbols = _.map(common.marketStocks, function(stock) { return stock.symbol} );

var channel = null, connection = null;

client.stream('statuses/filter', {track: symbols}, function(stream) {
    stream.on('data', function(tweet) {
        if (tweet.lang !== "en") return;
        var data = {};
        data.symbols = [];
        tweet.text = tweet.text.toLowerCase();
        for(var i=0; i<symbols.length; i++) {
            if (tweet.text.indexOf(symbols[i].toLowerCase()) !== -1)
                data.symbols[data.symbols.length] = symbols[i];
        }
        if (!data.symbols.length) return;

        data.text = tweet.text;
        data.twitter_id = tweet.id_str;
        console.log(data);
        channel.sendToQueue(common.qInput, new Buffer(JSON.stringify(data)), {persistent: true});
    });
});

function bail(err, conn) {
    console.error(err);
    if (conn) conn.close(function() { process.exit(1); });
}
function on_connectInputQueue(err, conn) {
    if (err !== null) return bail(err);
    connection = conn;
    conn.createChannel(function(err, ch) {
        if (err !== null) return bail(err, conn);
        channel = ch;
        ch.assertQueue(common.qInput, {durable: true}, function(err, _ok) {
            if (err !== null) return bail(err, conn);
        });
    });
}
amqp.connect(on_connectInputQueue);

var gracefulShutdown = function() {
    console.log("Received kill signal, shutting down gracefully.");
    channel.close(function() {
        connection.close();
        console.log("closing.");
        process.exit();
    });
}

// listen for TERM signal .e.g. kill
process.on ('SIGTERM', gracefulShutdown);

// listen for INT signal e.g. Ctrl-C
process.on ('SIGINT', gracefulShutdown);
