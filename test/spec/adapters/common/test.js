'use strict';

var Tests = [];

Tests.push(require('./test-common'));
Tests.push(require('./test-create-table'));
Tests.push(require('./test-join'));
Tests.push(require('./test-shared-connections'));

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var self = this;

  Tests.forEach(function (Test) {
    var adapterTest = new Test(self._Adapter, self._name);
    adapterTest.test();
  });

};

module.exports = Adapter;
