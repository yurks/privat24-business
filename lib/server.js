var log = require('./log');

var express = require('express'),
    bodyParser = require('body-parser'),

    path = require('path'),

    getPath = function(file) {
        return path.join(__dirname, '..', file);
    };


var wrapResponseData = require('./wrap-response-data');
var wrapTemplateData = require('./wrap-template-data');

module.exports = function(port, postHandler) {

    var app = express();

    app.set('view engine', 'pug');
    app.set('views', getPath('views'));
    app.use(bodyParser.json());

    app.use(express.static(getPath('public')));
    app.use('/lib', express.static(getPath('/bower_components')));


    app.get('/', function(req, res){
        res.render('index.pug', wrapTemplateData());
    });

    app.post('/', function(req, res) {
        req.pause();

        app.get('post handler')(req, function(err, data) {
            /*
            if (this && this.socket && this.path) {
                req.pipe(this);
            }
            */
            req.resume();
            res.json(wrapResponseData(err, data));
        });
    });

    app.use(function (err, req, res, next) {
        res.json(wrapResponseData(err));
    });

    app.set('post handler', postHandler);
    app.listen(port);
    log('started', 'http://127.0.0.1:' + port);
};


