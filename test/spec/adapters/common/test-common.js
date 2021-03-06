'use strict';

var testUtils = require('../../../utils'),
  commonUtils = require('deltadb-common-utils'),
  commonTestUtils = require('deltadb-common-utils/scripts/test-utils'),
  config = require('../../../config'),
  chai = require('chai'),
  expect = chai.expect,
  MissingError = require('../../../../scripts/common/missing-error'),
  DBExistsError = require('deltadb-common-utils/scripts/errors/db-exists-error');

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var self = this;

  describe(self._name + ' common', function () {

    var dbName = 'deltadb_orm_sql_testdb',
      host = config.adapters[self._name].host,
      username = config.adapters[self._name].username,
      password = config.adapters[self._name].password;

    var primaryStart = 1; // starting auto index

    var createDatabase = function () {
      return sql.createAndUse(dbName, host, username, password).then(
        function () {
          return sql.createTable('attrs', {
            id: {
              type: 'primary'
            },
            doc_id: {
              type: 'key',
              null: false
            },
            name: {
              type: 'varchar',
              length: 100,
              index: true
            },
            value: {
              type: 'text'
            },
            changed_by_user_id: {
              type: 'key'
            },
            destroyed_at: {
              type: 'datetime',
              index: true
            },
            recorded_at: {
              type: 'datetime',
              default: 'currenttimestamp',
              null: false,
              index: true
            },
            updated_at: {
              type: 'timestamp',
              default: 'currenttimestamp',
              null: false,
              index: true
            },
            hash: {
              type: 'varbinary',
              length: 32,
              unique: true
            },
            status: {
              type: 'enum',
              values: ['enabled', 'disabled'],
              unique: false
            },
            age: {
              type: 'smallint',
              null: true
            },
            destroyed: {
              type: 'boolean'
            }
          }, [{
            attrs: ['doc_id', 'name'],
            full: ['name']
          }], primaryStart);
        });
    };

    // TODO: use SQL describe or something similar to verify that DB was created successfully?

    var sql = null;

    beforeEach(function () {
      sql = new self._Adapter();
      return createDatabase();
    });

    afterEach(function () {
      return sql.dropAndCloseDatabase(dbName, host, username, password);
    });

    var shouldEqlDefault = function (results) {
      var rows = results.rows;
      testUtils.contains([{
        id: primaryStart + 1,
        doc_id: 1,
        name: 'thing',
        value: 'write a song',
        changed_by_user_id: null,
        destroyed_at: rows[0].destroyed_at,
        recorded_at: rows[0].recorded_at,
        updated_at: rows[0].updated_at
      }, {
        id: primaryStart + 2,
        doc_id: 1,
        name: 'priority',
        value: 'high',
        changed_by_user_id: null,
        destroyed_at: rows[1].destroyed_at,
        recorded_at: rows[1].recorded_at,
        updated_at: rows[1].updated_at
      }, {
        id: primaryStart + 3,
        doc_id: 1,
        name: 'done',
        value: '20%',
        changed_by_user_id: null,
        destroyed_at: rows[2].destroyed_at,
        recorded_at: rows[2].recorded_at,
        updated_at: rows[2].updated_at
      }], rows);
    };

    var shouldInsert = function () {
      return sql.insert({
            doc_id: '1',
            name: 'thing',
            value: 'write a song',
            destroyed_at: 'NOW()',
            age: undefined
          },
          'attrs', 'id', ['destroyed_at'])
        .then(function () {
          return sql.find(null, 'attrs');
        }).then(function (results) {
          var rows = results.rows;
          testUtils.contains([{
            id: primaryStart + 1,
            doc_id: 1,
            name: 'thing',
            value: 'write a song',
            changed_by_user_id: null,
            destroyed_at: rows[0].destroyed_at,
            recorded_at: rows[0].recorded_at,
            updated_at: rows[0].updated_at
          }], rows);
        }).then(function () {
          return sql.insert({
            doc_id: 1,
            name: 'priority',
            value: 'high'
          }, 'attrs', 'id');
        }).then(function () {
          return sql.insert({
            doc_id: 1,
            name: 'done',
            value: '20%'
          }, 'attrs', 'id');
        }).then(function () {
          return sql.find(null, 'attrs');
        }).then(function (results) {
          shouldEqlDefault(results);
          return results;
        });
    };

    it('should throw error when attr type not supported', function () {
      expect(function () {
        return sql.createTable('attrs', {
          id: {
            type: 'bad'
          }
        });
      }).to.throw('type bad not supported');
    });

    it('should throw error when attr default not supported', function () {
      expect(function () {
        return sql.createTable('attrs', {
          id: {
            default: 'bad'
          }
        });
      }).to.throw('default bad not supported');
    });

    it('should insert', function () {
      return shouldInsert();
    });

    // TODO: fully test join, where, order, limit, etc...
    it('should find with where', function () {
      return shouldInsert().then(function () {
        return sql.find(null, 'attrs', null, ['id', '=', '"' + (primaryStart + 1) +
          '"'
        ]);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'write a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }], rows);
      }).then(function () {
        return sql.find(null, 'attrs', null, [
          ['id', '=', '"' + (primaryStart + 1) + '"'], 'or', ['id', '=', '"' + (
            primaryStart + 2) + '"'], 'or', ['id', '=', '"' + (primaryStart + 3) +
            '"'
          ]
        ]);
      }).then(function (results) {
        shouldEqlDefault(results);
      }).then(function () {
        return sql.find(null, 'attrs', null, [
          [
            ['id', '=', '"' + (primaryStart + 1) + '"'], 'and', ['name', '=',
              '"thing"'
            ]
          ], 'or', [
            ['id', '=', '"' + (primaryStart + 2) + '"'], 'and', ['name', '=',
              '"priority"'
            ]
          ]
        ]);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'write a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }, {
          id: primaryStart + 2,
          doc_id: 1,
          name: 'priority',
          value: 'high',
          changed_by_user_id: null,
          destroyed_at: rows[1].destroyed_at,
          recorded_at: rows[1].recorded_at,
          updated_at: rows[1].updated_at
        }], rows);
      });
    });

    it('should find with like', function () {
      return sql.insert({
          doc_id: '1',
          name: 'thing',
          value: 'write a song',
          destroyed_at: 'NOW()'
        },
        'attrs', 'id', ['destroyed_at']).then(function () {
        return sql.find(null, 'attrs', null, ['value', '~', '"%write%"']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'write a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }], rows);
      }).then(function () {
        return sql.insert({
          doc_id: '2',
          name: 'thing',
          value: 'sing a song',
          destroyed_at: 'NOW()'
        }, 'attrs', 'id', ['destroyed_at']);
      }).then(function () {
        return sql.find(null, 'attrs', null, ['value', '!~', '"write%"']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 2,
          doc_id: 2,
          name: 'thing',
          value: 'sing a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }], rows);
      });
    });

    it('should find and order', function () {
      return shouldInsert().then(function () {
        return sql.find(null, 'attrs', null, null, ['id', 'asc']);
      }).then(function (results) {
        shouldEqlDefault(results);
      });
    });

    it('should update', function () {
      // TODO: more complicated where clause
      return shouldInsert().then(function () {
        return sql.update({
          value: 'medium'
        }, 'attrs', ['id', '=', '"-1"']); // no match
      }).then(function (results) {
        results.affected.should.eql(0);
      }).then(function () {
        return sql.update({
          value: 'medium'
        }, 'attrs', ['id', '=', '"' + (primaryStart + 2) + '"']);
      }).then(function (results) {
        results.affected.should.eql(1);
      }).then(function () {
        return sql.find(null, 'attrs', null, null, ['id', 'asc']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'write a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }, {
          id: primaryStart + 2,
          doc_id: 1,
          name: 'priority',
          value: 'medium',
          changed_by_user_id: null,
          destroyed_at: rows[1].destroyed_at,
          recorded_at: rows[1].recorded_at,
          updated_at: rows[1].updated_at
        }, {
          id: primaryStart + 3,
          doc_id: 1,
          name: 'done',
          value: '20%',
          changed_by_user_id: null,
          destroyed_at: rows[2].destroyed_at,
          recorded_at: rows[2].recorded_at,
          updated_at: rows[2].updated_at
        }], rows);
      });
    });

    // TODO: should replace: insert, update, no insert/update
    it('should replace', function () {
      return shouldInsert().then(function () {
        return sql.replace({
            doc_id: '1',
            name: 'status',
            value: 'assigned'
          },
          'attrs', 'id'); // insert
      }).then(function (results) {
        results.should.eql(primaryStart + 4);
      }).then(function () {
        return sql.find(null, 'attrs', null, null, ['id', 'asc']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'write a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }, {
          id: primaryStart + 2,
          doc_id: 1,
          name: 'priority',
          value: 'high',
          changed_by_user_id: null,
          destroyed_at: rows[1].destroyed_at,
          recorded_at: rows[1].recorded_at,
          updated_at: rows[1].updated_at
        }, {
          id: primaryStart + 3,
          doc_id: 1,
          name: 'done',
          value: '20%',
          changed_by_user_id: null,
          destroyed_at: rows[2].destroyed_at,
          recorded_at: rows[2].recorded_at,
          updated_at: rows[2].updated_at
        }, {
          id: primaryStart + 4,
          doc_id: 1,
          name: 'status',
          value: 'assigned',
          changed_by_user_id: null,
          destroyed_at: null,
          recorded_at: rows[3].recorded_at,
          updated_at: rows[3].updated_at
        }], rows);
      }).then(function () {
        return sql.replace({
            doc_id: '1',
            name: 'thing',
            value: 'play a song'
          },
          'attrs', 'id', ['id', '=', '"' + (primaryStart + 1) + '"']); // update
      }).then(function (results) {
        results.affected.should.eql(1);
      }).then(function () {
        return sql.find(null, 'attrs', null, null, ['id', 'asc']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'play a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }, {
          id: primaryStart + 2,
          doc_id: 1,
          name: 'priority',
          value: 'high',
          changed_by_user_id: null,
          destroyed_at: rows[1].destroyed_at,
          recorded_at: rows[1].recorded_at,
          updated_at: rows[1].updated_at
        }, {
          id: primaryStart + 3,
          doc_id: 1,
          name: 'done',
          value: '20%',
          changed_by_user_id: null,
          destroyed_at: rows[2].destroyed_at,
          recorded_at: rows[2].recorded_at,
          updated_at: rows[2].updated_at
        }, {
          id: primaryStart + 4,
          doc_id: 1,
          name: 'status',
          value: 'assigned',
          changed_by_user_id: null,
          destroyed_at: null,
          recorded_at: rows[3].recorded_at,
          updated_at: rows[3].updated_at
        }], rows);
      }).then(function () {
        return sql.replace({
            doc_id: '1',
            name: 'thing',
            value: 'sing a song'
          },
          'attrs', 'id', ['id', '=', '"-1"']); // no insert or update
      }).then(function (results) {
        results.affected.should.eql(0);
      }).then(function () {
        return sql.find(null, 'attrs', null, null, ['id', 'asc']);
      }).then(function (results) {
        var rows = results.rows;
        testUtils.contains([{
          id: primaryStart + 1,
          doc_id: 1,
          name: 'thing',
          value: 'play a song',
          changed_by_user_id: null,
          destroyed_at: rows[0].destroyed_at,
          recorded_at: rows[0].recorded_at,
          updated_at: rows[0].updated_at
        }, {
          id: primaryStart + 2,
          doc_id: 1,
          name: 'priority',
          value: 'high',
          changed_by_user_id: null,
          destroyed_at: rows[1].destroyed_at,
          recorded_at: rows[1].recorded_at,
          updated_at: rows[1].updated_at
        }, {
          id: primaryStart + 3,
          doc_id: 1,
          name: 'done',
          value: '20%',
          changed_by_user_id: null,
          destroyed_at: rows[2].destroyed_at,
          recorded_at: rows[2].recorded_at,
          updated_at: rows[2].updated_at
        }, {
          id: primaryStart + 4,
          doc_id: 1,
          name: 'status',
          value: 'assigned',
          changed_by_user_id: null,
          destroyed_at: null,
          recorded_at: rows[3].recorded_at,
          updated_at: rows[3].updated_at
        }], rows);
      });
    });

    it('should throw non-sql errors when replacing', function () {
      sql.insert = commonUtils.promiseErrorFactory(new Error('non-sql error'));

      return commonTestUtils.shouldThrow(function () {
        return sql.replace();
      }, new Error('non-sql error'));
    });

    it('should drop table', function () {
      return sql.dropTable('attrs');
    });

    it('should offset and group', function () {
      return shouldInsert().then(function () {
        // offset 1
        return sql.find(null, 'attrs', null, null, ['id', 'asc'], null, 1, ['name',
          'id'
        ]);
      }).then(function (results) {
        testUtils.contains([{
          name: 'priority',
          value: 'high'
        }, {
          name: 'done',
          value: '20%'
        }], results.rows);
      });
    });

    it('should find and throw if missing', function () {
      return commonTestUtils.shouldThrow(function () {
        return sql.findAndThrowIfMissing(null, 'attrs', null, ['id', '=', '"-1"']);
      }, new MissingError('missing record'));
    });

    it('should build', function () {
      return shouldInsert().then(function () {
        var replacements = [];
        var query = sql.findSQL(null, 'attrs', null, [
            ['name', '=', '"thing"'], 'or', ['name', '=', '"priority"']
          ], null, null, null,
          null, null, null, replacements);
        var builtQuery = sql.build(query, replacements);
        builtQuery.should.eql(
          "SELECT * FROM attrs WHERE ((name='thing') OR (name='priority'))");
      });
    });

    it('should include from nested query', function () {
      // Note: for now, we require all nested queries to be escaped before being used as parameters
      return shouldInsert().then(function () {
        var replacements = [];
        var query = sql.findSQL(['id'], 'attrs', null, [
            ['name', '=', '"thing"'], 'or', ['name', '=', '"priority"']
          ], null, null, null,
          null, null, null, replacements);
        var builtQuery = sql.build(query, replacements);
        return sql.find(['id', 'name'], 'attrs', null, ['id', 'in', '{' + builtQuery +
          '}'
        ]);
      }).then(function (results) {
        testUtils.contains([{
          id: primaryStart + 1,
          name: 'thing'
        }, {
          id: primaryStart + 2,
          name: 'priority'
        }], results.rows);
      });
    });

    it('should exclude from nested query', function () {
      // Note: for now, we require all nested queries to be escaped before being used as parameters
      return shouldInsert().then(function () {
        var replacements = [];
        var query = sql.findSQL(['id'], 'attrs', null, [
            ['name', '=', '"thing"'], 'or', ['name', '=', '"priority"']
          ], null, null, null,
          null, null, null, replacements);
        var builtQuery = sql.build(query, replacements);
        return sql.find(['id', 'name'], 'attrs', null, ['id', '!in', '{' + builtQuery +
          '}'
        ]);
      }).then(function (results) {
        testUtils.contains([{
          id: primaryStart + 3,
          name: 'done'
        }], results.rows);
      });
    });

    it('should select distinct values', function () {
      return shouldInsert().then(function () {
        var distinct = true;
        return sql.find(['doc_id'], 'attrs', null, null, null, null, null, null,
          distinct);
      }).then(function (results) {
        testUtils.contains([{
          doc_id: 1
        }], results.rows);
      });
    });

    it('should select with aliases', function () {
      return shouldInsert().then(function () {
        return sql.find({
          'doc_id': 'doc_id_alias'
        }, 'attrs', null, ['doc_id', '=', '"1"'], null, 1);
      }).then(function (results) {
        testUtils.contains([{
          doc_id_alias: 1
        }], results.rows);
      });
    });

    it('should identify if db exists', function () {
      return sql.dbExists(dbName, host, username, password).then(function (exists) {
        exists.should.eql(true);
      }).then(function () {
        return sql.dbExists(dbName + '_nope', host, username, password);
      }).then(function (exists) {
        exists.should.eql(false);
      });
    });

    it('should throw error when creating db if db exists', function () {
      return commonTestUtils.shouldThrow(function () {
        return sql._createDatabase(dbName);
      }, new DBExistsError());
    });

    var shouldTruncate = function (priAttr, priStart) {
      return shouldInsert().then(function () {
        return sql.truncateTable('attrs', priAttr, priStart);
      }).then(function () {
        return sql.find(null, 'attrs');
      }).then(function (results) {
        (results.rows === null).should.eql(true);
      });
    };

    it('should truncate', function () {
      return shouldTruncate();
    });

    // TODO: insert after truncation and make sure sequence reset
    it('should truncate and reset sequence', function () {
      return shouldTruncate('id', 2);
    });

    it('should destroy', function () {
      return shouldInsert().then(function () {
        return sql.destroy('attrs');
      }).then(function () {
        return sql.find(null, 'attrs');
      }).then(function (results) {
        (results.rows === null).should.eql(true);
      });
    });

  });
};

module.exports = Adapter;
