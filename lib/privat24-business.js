var express = require('express'),
    bodyParser = require('body-parser'),

    http = require('http'),
    https = require('https'),
    querystring = require('querystring'),
    xml2js = require('xml2js'),
    moment = require('moment'),
    open = require('open'),
    path = require('path'),

    getPath = function(file) {
        return path.join(__dirname, '..', file);
    },

    pkg = require('../package.json'),
    cfg = require('config.json')(getPath('config.json')),

    wrapResponceData = function(data, status) {
        return {
            status: status || 200,
            messages: Array.prototype.slice.call(arguments, 2),
            data: data || null
        };
    },

    getDate = function(begin_of_month) {
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        month = (month < 10 ? '0' : '') + month;

        var day = begin_of_month ? 1 : date.getDate();
        day = (day < 10 ? '0' : '') + day;

        return day + '.' + month + '.' + year;
    },

    wrapJadeData = function(_title, status) {

        var title = [pkg.name];
        if (_title) {
            title.unshift(_title);
        }
        var out = {
            name: pkg.name,
            description: pkg.description,
            version: pkg.version,
            author: pkg.author,
            title: title.join(' - '),
            current_date: getDate(),
            current_month: getDate(true)
        };
        status = status && parseInt(status, 10);
        if (status) {
            out.status = status;
        }
        return out;
    };

moment.lang('uk');

//Setup Express
var app = express();

app.set('views', getPath('views'));
app.set('view options', { layout: false });
app.use(bodyParser.json());
//app.use(express.cookieParser());
//app.use(express.session({ secret: 'shhhhhhhhh!'}));
app.use(express.static(getPath('public')));
app.use('/lib', express.static(getPath('/bower_components')));


app.get('/', function(req, res){
    res.render('index.jade', wrapJadeData());
});

app.post('/', function(request, response) {
    request.pause();

    var requestContinue = function() {
        if (this && this.socket && this.path) {
            request.pipe(p24request);
        }
        request.resume();
        response.json(wrapResponceData.apply(this, arguments));
    };

    var params = (request.body && request.body.data || []).filter(function(param) {
        return ['stdate', 'endate', 'UserName', 'UserPass'].indexOf(param.name) >=0 && !!param.value;
    });

    if (params.length !== 4) {
        return requestContinue(null, 400, 'Bad request data');
    }

    var p24data = querystring.stringify(params.reduce(function(o, param) {
        o[param.name] = param.value;
        return o;
    }, {
        'acc' : '%',
        'PUREXML': 'true',
        'showInf' : 'true'
    }));


    var p24request = https.request({
        host: cfg.p24.host, //remote host
        port: cfg.p24.port,
        method: 'POST',
        path: cfg.p24.path.statements,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': p24data.length
        }

    }, function(res) {
        var body = '';

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;

        }).on('end', function () {
            if (res.statusCode !== 200) {
                return requestContinue.call(p24request, null, res.statusCode, http.STATUS_CODES[res.statusCode]);
            }
            var rows = [], cards = {}, _accouns = {}, accounts = [];
            var addAccount = function(id, name) {
                if (!_accouns[id]) {
                    _accouns[id] = true;
                    if (cards[id]) {
                        cards[id] = {id: id, name: cards[id]};
                    } else {
                        accounts.push({id: id, name: name});
                    }
                }
            };

            xml2js.parseString(body, function(err, result) {
                if (err) {
                    return requestContinue.call(p24request, null, 'ParseError', err.message);
                }

                try {
                    (result.statements.info[0].cards[0].list[0].row || []).forEach(function(card) {
                        cards[card.account[0].$.acc] = card.account[0].$.name;
                    });

                    (result.statements.list[0].row || []).forEach(function(row) {
                        var info = row.info[0].$;
                        var amount = row.amount[0].$;
                        var debet = row.debet[0].account[0].$;
                        var debet_customer = row.debet[0].account[0].customer[0];
                        var credit = row.credit[0].account[0].$;
                        var credit_customer = row.credit[0].account[0].customer[0];

                        addAccount(credit.number, credit.name);
                        addAccount(debet.number, debet.name);

                        rows.push([
                            info.number,
                            [
                                moment(info.postdate, 'YYYYMMDDTHH:mm:ss').format('DD.MM.YYYY HH:mm:ss dddd'),
                                info.postdate
                            ],
                            amount.amt,
                            amount.ccy,
                            row.purpose + '',
                            [
                                credit.name,
                                credit_customer.$.crf,
                                credit.number,
                                credit_customer.bank[0]._,
                                credit_customer.bank[0].$.code,
                                credit_customer.bank[0].city[0]
                            ],
                            [
                                debet.name,
                                debet_customer.$.crf,
                                debet.number,
                                debet_customer.bank[0]._,
                                debet_customer.bank[0].$.code,
                                debet_customer.bank[0].city[0]
                            ],
                            [
                                info.ref,
                                //info.refp,
                                {r: 'проведен', t: 'сторнирован'}[info.state],
                                {r: 'реальный', i: 'информационный'}[info.flinfo],
                                {p: 'поручение', t: 'требование', m: 'мемориальный ордер', x: 'приходный ордер', r: 'расходный ордер'}[info.doctype]
                            ]
                        ]);

                        //statements/list/row/info/@ - клиентская дата и время
                        //statements/list/row/info/@ref - банковский референс
                        //statements/list/row//info/@state - состояние документа (r - проведен, t - сторнирован)
                        //statements/list/row//info/@flinfo - вид платежа (r - реальный, i - информационный)
                        //statements/list/row//info/@doctype - тип документа (p - поручение, t - требование, m - мемориальный ордер, x - приходный ордер, r - расходный ордер)

                        //statements/list/row/debet/account/@name - наименование плательщика
                        //statements/list/row/debet/account/@number - счет плательщика
                        //statements/list/row/debet/account/customer/@crf - код ИНН / ЕГРПОУ плательщика
                        //statements/list/row/debet/account/customer/bank/@code - МФО банка плательщика
                        //statements/list/row/debet/account/customer/bank/city/text() - наимнование банка плательщика

                        //statements/list/row/credit/account/@name - наименование получателя
                        //statements/list/row/credit/account/@number - счет получателя
                        //statements/list/row/credit/account/customer/@crf - код ИНН / ЕГРПОУ получателя
                        //statements/list/row/credit/account/customer/bank/@code - МФО банка получателя
                        //statements/list/row/credit/account/customer/bank/city/text() - наименование банка получателя

                        //statements/list/row/purpose - назначение платежа

                    });

                    accounts = Object.keys(cards).filter(function(id) {
                        return typeof cards[id] !== 'string';
                    }).map(function(id, i) {
                        if (!i) {
                            accounts.unshift({id:'', name: '---', disabled: true});
                        }
                        return cards[id];
                    }).concat(accounts);

                } catch(e) {
                    return requestContinue.call(p24request, null, 'StructureError', e.message);
                }
                return requestContinue.call(p24request, {rows: rows, accounts: accounts});
            });
        });
    });

    p24request.on('error', function(e) {
        requestContinue.call(p24request, null, e.code, e.message);
    });
    p24request.write(p24data);
    p24request.end();
});


app.listen(cfg.port);

if (cfg.browser !== false) {
    open('http://127.0.0.1:' + cfg.port);
}

console.log('Listening on http://127.0.0.1:' + cfg.port );
