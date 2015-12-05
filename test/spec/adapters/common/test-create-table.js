'use strict';

var config = require('../../../config');

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var self = this;

  describe(self._name + ' common create table', function () {

    var dbName = 'deltadb_orm_sql_testdb',
      host = config.adapters[self._name].host,
      username = config.adapters[self._name].username,
      password = config.adapters[self._name].password;

    var schema = {
      id: {
        type: 'primary'
      },
      name: {
        type: 'varchar',
        length: 100,
        index: true
      }
    };

    var createDatabase = function () {
      return sql.createAndUse(dbName, host, username, password);
    };

    var sql = null;

    beforeEach(function () {
      sql = new self._Adapter();
      return createDatabase();
    });

    afterEach(function () {
      return sql.dropAndCloseDatabase(dbName, host, username, password);
    });

    it('should create table', function () {
      return sql.createTable('attrs', schema);
    });

    it('should create table with no null or full keys', function () {
      var unique = [{
        attrs: ['id', 'name']
      }];
      return sql.createTable('attrs', schema, unique);
    });

    it('should create table with no null keys', function () {
      var unique = [{
        attrs: ['id', 'name'],
        null: ['name']
      }];
      return sql.createTable('attrs', schema, unique);
    });

    it('should create table with full null keys', function () {
      var unique = [{
        attrs: ['id', 'name'],
        full: ['name']
      }];
      return sql.createTable('attrs', schema, unique);
    });

  });
};

module.exports = Adapter;
