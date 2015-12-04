'use strict';

var TestCommon = require('./test-common'),
  TestSharedConnections = require('./test-shared-connections'),
  TestCreateTable = require('./test-create-table');

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var testCommon = new TestCommon(this._Adapter, this._name);
  testCommon.test();

  var testSharedConnections = new TestSharedConnections(this._Adapter, this._name);
  testSharedConnections.test();

  var testCreateTable = new TestCreateTable(this._Adapter, this._name);
  testCreateTable.test();
};

module.exports = Adapter;
