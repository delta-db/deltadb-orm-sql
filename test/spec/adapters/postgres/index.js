'use strict';

var SQL = require('../../../../scripts/adapters/postgres'),
  commonTestUtils = require('deltadb-common-utils/scripts/test-utils'),
  connections = require('../../../../scripts/adapters/postgres/connections'),
  SocketClosedError = require('../../../../scripts/common/socket-closed-error'),
  utils = require('deltadb-common-utils'),
  DBMissingError = require('deltadb-common-utils/scripts/errors/db-missing-error'),
  config = require('../../../config');

describe('postgres', function () {

  var sql = null,
    dbName = 'deltadb_orm_sql_testdb',
    host = config.adapters.postgres.host,
    username = config.adapters.postgres.username,
    password = config.adapters.postgres.password;

  beforeEach(function () {
    sql = new SQL();
  });

  it('should throw errors when connecting', function () {
    var err = new Error();
    return commonTestUtils.shouldNonPromiseThrow(function () {
      sql._processConnectError(err);
    }, err);
  });

  it('should prevent race conditions when unregistering', function () {
    // This fn would throw an error if it was unable to handle the race conditions
    return connections._unregister(1, 'db', 'host', 'username', 'password', 8080);
  });

  it('should handle race conditions when querying', function () {
    // Fake
    sql._connection = null;

    return commonTestUtils.shouldThrow(function () {
      return sql._query();
    }, new SocketClosedError());
  });

  it('should throw pg error when listener missing', function () {
    SQL.error(null); // clear error listener
    var err = new Error('some error');
    return commonTestUtils.shouldNonPromiseThrow(function () {
      SQL._onPGError(err);
    }, err);
  });

  it('should throw error if db missing when querying', function () {
    // This can happen if the DB is destroyed while a query is being executed

    // Fake
    var err = new DBMissingError('database "mydb" does not exist');
    sql._connection = {
      connection: {
        query: utils.promiseErrorFactory(err)
      }
    };

    return commonTestUtils.shouldThrow(function () {
      return sql._query();
    }, err);

  });

  it('should close when already disconnected', function () {
    // Assume success if no error is thrown
    return sql.close();
  });

  it('should drop and close when already disconnected', function () {
    return sql.createAndUse(dbName, host, username, password).then(function () {
      return sql.close();
    }).then(function () {
      // Assume success if no error is thrown
      return sql.dropAndCloseDatabase(dbName, host, username, password);
    });
  });

});
