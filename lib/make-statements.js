'use strict';

var moment = require('moment');
moment.locale('uk');

module.exports = function(result) {

    var rows = [], cards = {}, _accouns = {}, accounts = [], summary = {};
    var addAccount = function(id, name, credit) {
        credit = !!credit;
        var key = id + ':' + credit;

        if (!_accouns[key]) {
            if (cards[id]) {
                _accouns[id] = cards[id];
                _accouns[key] = Object.assign({}, cards[id], {credit: credit});
            } else {
                _accouns[id] = {id: id, name: name};
                _accouns[key] = Object.assign({}, _accouns[id], {credit: credit});
            }
            accounts.push(_accouns[key]);
        }
    };


    function fillAmount(store, prop, amt, wrap_prop) {
        if (wrap_prop) {
            store = store[wrap_prop] = store[wrap_prop] || {};
        }
        store[prop] = store[prop] || 0;
        store[prop] += amt;
        store[prop] = parseFloat(store[prop].toFixed(2));
        if (store[prop] === 0) {
            delete store[prop];
        }
    }

    function fillSummary(from, to, amt, ccy, in_or_out) {
        summary.store = summary.store || {};
        var store = summary.store[from] = summary.store[from] || {};
        amt = parseFloat(amt);
        fillAmount(store, to, amt);
        in_or_out = in_or_out ? 'in' : 'out';
        fillAmount(store, in_or_out, amt, 'total');
        summary.total = summary.total || {};
        fillAmount(summary.total, in_or_out, amt, ccy);
    }

    function collectSummary(debet_id, credit_id, amt, ccy) {
        if (cards[debet_id]) {
            fillSummary(debet_id, credit_id, amt, ccy);
        } else if (cards[credit_id]) {
            fillSummary(credit_id, debet_id, amt, ccy, true);
        }
    }


    var dump = summary.dump = {
        stdate: 0,
        endate: 0
    };


    /*
    delete result.rests.menu;
    console.log(JSON.stringify((result.rests.list[0].row || []).map(function(data) {
        var row = data.turn[0];
        return row.$.account + ' ' + row._ + ' ' + row.date[0].$.traditional + ' ' + row.inrest[0] + ' ' + row.outrest[0]
    }), 0, 2))
    */

    (result.statements.info[0].cards[0].list[0].row || []).forEach(function(card) {
        cards[card.account[0].$.acc] = {id: card.account[0].$.acc, name: card.account[0].$.name, ccy: card.account[0].$.ccy} ;
    });

    (result.statements.list[0].row || []).forEach(function(row) {
        var info = row.info[0].$;
        var amount = row.amount[0].$;
        var debet = row.debet[0].account[0].$;
        var debet_customer = row.debet[0].account[0].customer[0];
        var credit = row.credit[0].account[0].$;
        var credit_customer = row.credit[0].account[0].customer[0];

        addAccount(debet.number, debet.name);
        addAccount(credit.number, credit.name, true);


        collectSummary(debet.number, credit.number, amount.amt, amount.ccy);

        if (!dump._stdate || info.postdate < dump._stdate) {
            dump._stdate = info.postdate;
            dump.stdate = moment(info.postdate, 'YYYYMMDDTHH:mm:ss').format('DD.MM.YYYY');
            dump._st_m = moment(info.postdate, 'YYYYMMDDTHH:mm:ss').format('M');
            //dump.period = dump._en_m - dump._st_m + 1;
        }
        if (!dump._endate || info.postdate > dump._endate) {
            dump._endate = info.postdate;
            dump.endate = moment(info.postdate, 'YYYYMMDDTHH:mm:ss').format('DD.MM.YYYY');
            dump._en_m = moment(info.postdate, 'YYYYMMDDTHH:mm:ss').format('M');
            //dump.period = dump._en_m - dump._st_m + 1;
        }
        dump.period = dump.stdate + (dump.stdate !== dump.endate ? ' — ' + dump.endate : '');

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

    var summaryData = [];
    var summaryHeader = [];

    Object.keys(summary.store || {}).sort(function(a, b) {
        var nameA = _accouns[a] && _accouns[a].ccy || '';
        var nameB = _accouns[b] && _accouns[b].ccy || '';
        var topCCY = 'UAH';
        if (nameA !== topCCY && nameB === topCCY) {
            return 1;
        }
        if (nameA === topCCY && nameB !== topCCY) {
            return -1;
        }
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;

    }).forEach(function(acc, acc_index, _accs) {
        var summaryAcc = summary.store[acc];
        if (summaryAcc) {
            summaryHeader[acc_index*2] = Object.assign({}, _accouns[acc], {direction: '+', total: summaryAcc.total.in || 0});
            summaryHeader[acc_index*2+1] = Object.assign({}, _accouns[acc], {direction: '-', total: summaryAcc.total.out || 0});
            Object.keys(summaryAcc).forEach(function(acc2) {
                if (acc2 !== 'total') {
                    var row = new Array(_accs.length*2);
                    row[summaryAcc[acc2] < 0 ? acc_index*2 + 1 : acc_index*2] = summaryAcc[acc2];
                    row.unshift(_accouns[acc2]);
                    summaryData.push(row)
                }
            });
        }
    });


    summaryHeader.unshift(null);
    summary.header = summaryHeader;
    summary.data = summaryData;

    return {rows: rows, accounts: accounts, summary: summary, dump: dump}
};
