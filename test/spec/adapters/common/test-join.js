'use strict';

var config = require('../../../config'),
  Promise = require('bluebird');

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var self = this;

  describe(self._name + ' common join', function () {

    var dbName = 'deltadb_orm_sql_testdb',
      host = config.adapters[self._name].host,
      username = config.adapters[self._name].username,
      password = config.adapters[self._name].password;

    var schema = {
      id: {
        type: 'primary'
      },
      friend_id: {
        type: 'key',
        null: true
      },
      name: {
        type: 'varchar',
        length: 100,
        index: true
      }
    };

    var sql = null;

    var records = [{
      id: 1,
      friend_id: 2,
      name: 'Jack'
    }, {
      id: 2,
      friend_id: 1,
      name: 'Jill'
    }, {
      id: 3,
      friend_id: null,
      name: 'Bill'
    }];

    var insert = function () {
      var promises = [];
      records.forEach(function (record) {
        promises.push(sql.insert(record, 'friends', 'id'));
      });
      return Promise.all(promises);
    };

    beforeEach(function () {
      sql = new self._Adapter();
      return sql.createAndUse(dbName, host, username, password).then(function () {
        return sql.createTable('friends', schema);
      }).then(function () {
        return insert();
      });
    });

    afterEach(function () {
      return sql.dropAndCloseDatabase(dbName, host, username, password);
    });

    it('should join', function () {

      var joins = {
        joins: {
          'friends friends2': ['friends2.id', '=', 'friends1.friend_id']
        }
      };

      return sql.find(['friends1.id', 'friends1.name', 'friends2.name'],
        'friends friends1', joins, null, ['friends1.id', 'asc']).then(
        function (results) {
          results.rows.should.eql([{
            'friends1.id': 1,
            'friends1.name': 'Jack',
            'friends2.name': 'Jill'
          }, {
            'friends1.id': 2,
            'friends1.name': 'Jill',
            'friends2.name': 'Jack'
          }]);
        });
    });

    it('should left join', function () {

      var joins = {
        left_joins: {
          'friends friends2': ['friends2.id', '=', 'friends1.friend_id']
        }
      };

      return sql.find(['friends1.id', 'friends1.name', 'friends2.name'],
        'friends friends1', joins, null, ['friends1.id', 'asc']).then(
        function (results) {
          results.rows.should.eql([{
            'friends1.id': 1,
            'friends1.name': 'Jack',
            'friends2.name': 'Jill'
          }, {
            'friends1.id': 2,
            'friends1.name': 'Jill',
            'friends2.name': 'Jack'
          }, {
            'friends1.id': 3,
            'friends1.name': 'Bill',
            'friends2.name': null
          }]);
        });
    });

  });
};

module.exports = Adapter;
