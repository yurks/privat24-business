'use strict';

var querystring = require('querystring');
var https = require('https');
var http = require('http');
var xml2js = require('xml2js');
var params = require ('./params');

function newError(code) {
    var err = new Error();
    if (code) {
        err.code = code;
    }
    return err;
}

module.exports = function(opts, cb, data, dataPostProcess) {

    opts = JSON.parse(JSON.stringify(opts));

    if (data) {
        if (Array.isArray(data)) {
            data = params(data);
            if (data === false) {
                cb.call(null, newError(400));
                return false;
            }
        }
    }

    if (dataPostProcess) {
        dataPostProcess(data);
    }

    opts.query = JSON.parse(JSON.stringify(data));
    opts.search = typeof data !== 'string' ? querystring.stringify(data) : data || '';
    opts.pathname = opts.path;
    opts.protocol = opts.port === 443 ? 'https:' : 'http:';

    if (opts.method === 'POST') {
        opts.headers = opts.headers || {};
        opts.headers['Content-Length'] = opts.search.length;
    } else {
        opts.path += '?' + opts.search;
    }

    var req = (opts.protocol === 'http:' ? http : https).request(opts, function(res) {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;

        }).on('end', function () {

            if (res.statusCode !== 200 && res.statusCode !== 301 && res.statusCode !== 302) {
                return cb.call(req, newError(res.statusCode));
            }

            xml2js.parseString(body, function(err, result) {
                if (err) {
                    return cb.call(req, err);
                }
                try {
                    return cb.call(req, null, result);
                } catch(err) {
                    return cb.call(req, err);
                }
            });
        });
    });

    req.on('error', function(err) {
        cb.call(req, err);
    });

    if (opts.method === 'POST') {
        req.write(opts.search);
    }
    req.end();

    return JSON.parse(JSON.stringify(opts));
};
