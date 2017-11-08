'use strict';
var pkg = require('../package.json');

function getDate(begin_of_month) {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? '0' : '') + month;

    var day = begin_of_month ? 1 : date.getDate();
    day = (day < 10 ? '0' : '') + day;

    return day + '.' + month + '.' + year;
}

module.exports = function() {
    var title = [pkg.name];

    var out = {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        author: pkg.author,
        title: title.join(' - '),
        current_date: getDate(),
        current_month: getDate(true)
    };

    return out;
};
