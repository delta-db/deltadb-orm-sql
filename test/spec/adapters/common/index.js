'use strict';

var adapterTests = require('./tests'),
  adapters = require('../../../../scripts/adapters');

describe('common', function () {

  adapterTests.test(adapters);

});
