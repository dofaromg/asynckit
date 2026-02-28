var test      = require('tape').test
  , waterfall = require('../').waterfall
  , defer     = require('../lib/defer.js')
  ;

test('waterfall: runs tasks in series passing results', function(t)
{
  t.plan(6);

  waterfall([
    function(cb)
    {
      t.pass('step 1 called');
      setTimeout(function() { cb(null, 1, 2); }, 10);
    },
    function(a, b, cb)
    {
      t.equal(a, 1, 'step 2 receives first result from step 1');
      t.equal(b, 2, 'step 2 receives second result from step 1');
      setTimeout(function() { cb(null, a + b); }, 10);
    },
    function(sum, cb)
    {
      t.equal(sum, 3, 'step 3 receives sum from step 2');
      setTimeout(function() { cb(null, sum * 2); }, 10);
    }
  ],
  function(err, result)
  {
    t.error(err, 'expect no errors');
    t.equal(result, 6, 'expect final result to be 6');
  });
});

test('waterfall: handles sync tasks asynchronously', function(t)
{
  var isAsync = false;

  t.plan(3);

  defer(function() { isAsync = true; });

  waterfall([
    function(cb) { cb(null, 'hello'); },
    function(msg, cb) { cb(null, msg + ' world'); }
  ],
  function(err, result)
  {
    t.ok(isAsync, 'expect async response');
    t.error(err, 'expect no errors');
    t.equal(result, 'hello world', 'expect result to be concatenated string');
  });
});

test('waterfall: handles errors and stops execution', function(t)
{
  var callCount = 0;

  t.plan(2);

  waterfall([
    function(cb)
    {
      callCount++;
      cb(null, 'ok');
    },
    function(msg, cb)
    {
      callCount++;
      cb(new Error('step 2 failed'));
    },
    function(msg, cb)
    {
      t.fail('step 3 should not be called');
      cb(null, 'never');
    }
  ],
  function(err)
  {
    t.ok(err, 'expect error');
    t.equal(callCount, 2, 'expect only 2 steps to have run');
  });
});

test('waterfall: handles empty task list', function(t)
{
  t.plan(2);

  waterfall([], function(err, result)
  {
    t.error(err, 'expect no error for empty list');
    t.equal(result, undefined, 'expect no result for empty list');
  });
});

test('waterfall: terminated early from outside', function(t)
{
  var callCount = 0
    , terminator
    ;

  t.plan(1);

  terminator = waterfall([
    function(cb)
    {
      callCount++;
      setTimeout(function() { cb(null, 'step1'); }, 50);
      return function() { callCount--; };
    },
    function(msg, cb)
    {
      t.fail('step 2 should not be called');
      cb(null, msg);
    }
  ],
  function(err)
  {
    t.error(err, 'expect no error response after termination');
  });

  // terminate before first step completes
  setTimeout(function() { terminator(); }, 10);
});
