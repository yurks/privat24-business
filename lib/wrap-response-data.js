'use strict';
var http = require('http');
var log = require('./log');

module.exports = function(err, data) {
    var msg, code = 200;
    if (err) {
        msg = [];
        code = err.code !== 200 && err.code || 500;
        msg.push(http.STATUS_CODES[code]);

        if (err.message) {
            msg.push(err.message);
        }
        if (err.stack) {
            log(err.stack);
        }
    }

    return {
        status: code,
        messages: msg,
        data: data || null
    };
};
