'use strict';

var log = require('./log');
var _fetch = require('./fetch');
var url = require('url');

module.exports = function(_opts, cb, data, dataPostProcess) {
    return new Promise(function(resolve, reject) {
        var opts = _fetch(_opts, function(err, result) {
            if (err) {
                return reject(err);
            }
            resolve(cb(result));

        }, data, dataPostProcess);

        if (opts !== false) {
            opts.query.UserPass = '***';
            delete opts.search;
            log('request', opts.method + ' ' + url.format(opts));
        }
    });
};
