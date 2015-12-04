'use strict';

var utils = require('deltadb-common-utils');

var Utils = function () {};

Utils.prototype.contains = function (expected, actual) {
  utils.each(expected, function (item, i) {
    expected[i] = utils.merge(actual[i], item);
  });
  actual.should.eql(expected);
};

module.exports = new Utils();
