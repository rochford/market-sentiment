/*
 * Copyright 2014, Timothy Rochford
 */
"use strict";

var mongodb = require('mongojs');

module.exports.init = function (callback) {
    var databaseUrl = process.env.MONGO_SERVER_URL, // "username:password@example.com/mydb"
        collections = ["sentiment"];
    module.exports.db = require("mongojs").connect(databaseUrl, collections);
    callback();
}
