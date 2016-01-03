'use strict';

var config = require('../../../config');

/**
 * Sharing one connection between multiple ticks is complicated and is tested here.
 */

var Adapter = function (AdapterClass, name) {
  this._Adapter = AdapterClass;
  this._name = name;
};

Adapter.prototype.test = function () {

  var self = this;

  describe(self._name + ' common shared connections', function () {

    // Set an error listener and ignore errors as we can expect to get errors like "terminating
    // connection due to administrator command"
    self._Adapter.error(function () {});

    var postgres = null,
      dbPostgres = 'postgres',
      dbTest = 'deltadb_orm_sql_testdb',
      host = config.adapters[self._name].host,
      username = config.adapters[self._name].username,
      password = config.adapters[self._name].password,
      port = null;

    beforeEach(function () {
      postgres = new self._Adapter();
    });

    it('should allow simulatenous queries', function () {
      var orm1 = new self._Adapter(),
        orm2 = new self._Adapter();
      return orm1.connect(dbPostgres, host, username, password, port).then(function () {
        return orm2.connect(dbPostgres, host, username, password, port);
      }).then(function () {
        return orm1._query('SELECT NOW()');
      }).then(function () {
        return orm2._query('SELECT NOW()');
      }).then(function () {
        return orm1.close(dbPostgres, host, username, password, port);
      }).then(function () {
        return orm2.close(dbPostgres, host, username, password, port);
      });
    });

    it('should retry connections', function () {
      var test1 = new self._Adapter(),
        test2 = new self._Adapter();
      return postgres.connect(dbPostgres, host, username, password, port).then(function () {
        return test1.connect(dbTest, host, username, password, port).catch(function () {
          // failed and is ok as db doesnt exist
        });
      }).then(function () {
        return postgres._createDatabase(dbTest);
      }).then(function () {
        return test2.connect(dbTest, host, username, password, port);
      }).then(function () {
        // test2 connect succeeded!
      }).then(function () {
        // return test1.close(dbTest, host, username, password, port);
      }).then(function () {
        return test2.close(dbTest, host, username, password, port);
      }).then(function () {
        return postgres._dropDatabase(dbTest);
      }).then(function () {
        return postgres.close(dbPostgres, host, username, password, port);
      });
    });

    it('should destroy connections', function () {
      // Make sure that destroying a database doesn't tie up the connections
      var test1 = new self._Adapter(),
        test2 = new self._Adapter();
      return postgres.connect(dbPostgres, host, username, password, port).then(function () {
        return postgres._createDatabase(dbTest);
      }).then(function () {
        return test1.connect(dbTest, host, username, password, port);
      }).then(function () {
        // Close the connections by all clients so that we can drop the database
        return postgres._closeConnections(dbTest).catch(function () {
          // Ignore SocketClosedError caused by forcing a closure of all connections
        });
      }).then(function () {
        return postgres.connect(dbPostgres, host, username, password, port);
      }).then(function () {
        return postgres._dropDatabase(dbTest);
      }).then(function () {
        return test2.connect(dbTest, host, username, password, port).catch(function () {
          // Ignore error as just want to make sure nothing blocks
        });
      }).then(function () {
        return test1._query('SELECT NOW()').catch(function () {
          // Ignore error as just want to make sure nothing blocks
        });
      }).then(function () {
        return test2._query('SELECT NOW()').catch(function () {
          // Ignore error as just want to make sure nothing blocks
        });
      }).then(function () {
        return postgres.close(dbPostgres, host, username, password, port);
      });
    });

    it('should identify when db exists', function () {
      var test1 = new self._Adapter(),
        test2 = new self._Adapter();
      return postgres.connect(dbPostgres, host, username, password, port).then(function () {
        return postgres._createDatabase(dbTest);
      }).then(function () {
        return test1.connect(dbTest, host, username, password, port);
      }).then(function () {
        // Close the connections by all clients so that we can drop the database
        return postgres._closeConnections(dbTest).catch(function () {
          // Ignore SocketClosedError caused by forcing a closure of all connections
        });
      }).then(function () {
        return postgres.connect(dbPostgres, host, username, password, port);
      }).then(function () {
        return postgres._dropDatabase(dbTest);
      }).then(function () {
        return test2.dbExists(dbTest, host, username, password, port);
      }).then(function (exists) {
        exists.should.eql(false);
      }).then(function () {
        return postgres.close(dbPostgres, host, username, password, port);
      });
    });

    it('should drop and close when multiple connections', function () {
      // Make sure that destroying a database doesn't tie up the connections
      var test1 = new self._Adapter(),
        test2 = new self._Adapter();
      return postgres.connect(dbPostgres, host, username, password, port).then(function () {
        return postgres._createDatabase(dbTest);
      }).then(function () {
        return test1.connect(dbTest, host, username, password, port);
      }).then(function () {
        return test2.connect(dbTest, host, username, password, port);
      }).then(function () {
        // Destroy even if being used by other clients
        return test1.dropAndCloseDatabase(dbTest, host, username, password, port);
      }).then(function () {
        return postgres.close(dbPostgres, host, username, password, port);
      });
    });

  });

};

module.exports = Adapter;
