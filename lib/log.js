'use strict';

module.exports = function(mode, text) {
    console.log('[' + new Date().toISOString() + '] ' + mode + ': ' + text);
};
