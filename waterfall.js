var defer = require('./lib/defer.js')
  , abort = require('./lib/abort.js')
  ;

// Public API
module.exports = waterfall;

/**
 * Runs array of tasks in series, passing results of each task to the next
 *
 * @param   {array} list - array of tasks to run in series
 * @param   {function} callback - invoked when all tasks are done or on error
 * @returns {function} - jobs terminator
 */
function waterfall(list, callback)
{
  var state =
    {
      index: 0,
      jobs : {},
      size : list.length
    };

  // start with empty args
  iterate(list, state, [], callback);

  return terminator.bind(state, callback);
}

/**
 * Wraps a callback to ensure it is called asynchronously,
 * preserving all arguments passed to it
 *
 * @param   {function} callback - callback to wrap
 * @returns {function} - async-safe callback
 */
function asyncCallback(callback)
{
  var isAsync = false;

  defer(function() { isAsync = true; });

  return function()
  {
    var args = Array.prototype.slice.call(arguments);

    if (isAsync)
    {
      callback.apply(null, args);
    }
    else
    {
      defer(function()
      {
        callback.apply(null, args);
      });
    }
  };
}

/**
 * Iterates over each task, passing previous results as arguments
 *
 * @param {array} list - array of tasks
 * @param {object} state - current job status
 * @param {array} args - arguments to pass to the next task
 * @param {function} callback - invoked when all tasks processed
 */
function iterate(list, state, args, callback)
{
  var key = state.index;

  if (key >= state.size)
  {
    callback.apply(null, [null].concat(args));
    return;
  }

  var task = list[key];

  // append the per-step callback to the args
  var taskArgs = args.concat([asyncCallback(function(error)
  {
    // don't repeat yourself
    if (!(key in state.jobs))
    {
      return;
    }

    // clean up jobs
    delete state.jobs[key];

    if (error)
    {
      // abort remaining
      abort(state);
      callback(error);
      return;
    }

    // collect results (everything after error arg)
    var results = Array.prototype.slice.call(arguments, 1);

    state.index++;
    iterate(list, state, results, callback);
  })]);

  state.jobs[key] = task.apply(null, taskArgs);
}

/**
 * Terminates jobs in the attached state context
 *
 * @this  AsyncKitState#
 * @param {function} callback - final callback to invoke after termination
 */
function terminator(callback)
{
  if (!Object.keys(this.jobs).length)
  {
    return;
  }

  // fast forward index
  this.index = this.size;

  // abort jobs
  abort(this);

  // send back empty results
  defer(function() { callback(null); });
}
