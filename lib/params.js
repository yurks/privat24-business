'use strict';

function formatDate(date) {
    return ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + '.' + date.getFullYear();
}

function setDate(o, val, get_first_day) {
    val = val.split('/').reverse();
    if (get_first_day === false) {
        val.push(0);
    } else {
        val[1]--;
    }
    val.unshift(null);
    o[get_first_day === false ? 'endate' : 'stdate'] = formatDate(new (Function.prototype.bind.apply(Date, val)));
}

module.exports = function(data) {
    var params = (data || []).filter(function(param) {
        return ['range', 'stmonth', 'enmonth', 'stdate', 'endate', 'UserName', 'UserPass'].indexOf(param.name) >=0 && !!param.value;
    });
    if (params.length < 3 || params.length > 4) {
        return false;
    }

    var p24data = params.reduce(function(o, param) {
        if (param.name === 'range') {
            var range = param.value.split(' - ');
            setDate(o, range[0]);
            if (range[1]) {
                setDate(o, range[1], false);
            } else {
                setDate(o, range[0], false);
            }
        } else if (param.name === 'stmonth') {
            setDate(o, param.value);
        } else if (param.name === 'enmonth') {
            setDate(o, param.value, false);
        } else {
            o[param.name] = param.value;
        }
        return o;
    }, {
        'acc' : '%',
        'PUREXML': 'true',
        'showInf' : 'true'
    });

    if (!p24data.endate) {
        setDate(p24data.stdate, false);
    }

    return p24data;

};
