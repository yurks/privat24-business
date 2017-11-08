'use strict';

var cfg = require('../config.json');
var server = require('./server');

var handler = function(req, cb) {
    var request = require('./request');
    var makeStatements = require('./make-statements');
    var makeRest = require('./make-rest');

    var body = req.body && req.body.data;

    Promise.all([
        request(cfg.p24.statements, makeStatements, body),
        Promise.all(
            [
                request(cfg.p24.rest, makeRest, body, function(data) {
                    data.endate = data.stdate;
                }),
                request(cfg.p24.rest, makeRest, body, function(data) {
                    data.stdate = data.endate;
                })
            ]
        ).then(function(data) {
            var from = data[0].rests;
            var to = data[1].rests;
            var rests = {};

            rests.data = Object.keys(from).map(function(account) {
                var out = from[account];
                rests.from = out.date;
                rests.to = to[account].date;
                return [out.label + ' :: ' + account, out.inrest, to[account].outrest, (parseFloat(out.outrest) - parseFloat(out.inrest)).toFixed(2)]
            });

            rests.header = [
                {title: '#'},
                {title: rests.from},
                {title: rests.to},
                {title: 'Diff'}
            ];

            return {rests: rests};
        })

    ]).then(function(data) {
        cb(null, Object.assign.apply(Object.assign, data));
    }).catch(cb);
};

server(cfg.port, handler);

if (cfg.browser !== false) {
    //open('http://127.0.0.1:' + cfg.port);
}
