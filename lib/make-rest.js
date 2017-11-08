'use strict';

var moment = require('moment');
moment.locale('uk');

module.exports = function(result) {

    var rests = (result.rests.list[0].row || []).reduce(function(o, data) {
        var row = data.turn[0];
        o[row.$.account] = {
            account: row.$.account,
            label: row._,
            date: row.date[0].$.traditional,
            inrest: row.inrest[0],
            outrest: row.outrest[0]
        };
        return o;
    }, {});

    return {rests: rests}
};
