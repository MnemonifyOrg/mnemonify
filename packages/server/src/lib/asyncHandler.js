// Express 4 does not catch a promise rejected inside an `async (req, res)
// => {}` route handler -- an unhandled rejection there does not become an
// HTTP error response, it becomes an *unhandled promise rejection at the
// process level*, and Node (v15+) terminates the process on those by
// default. Every route handler across this API except assets.js's single
// `/assets/upload` handler was missing this (see DECISIONS.md, Step 0):
// wrapping every handler with this forwards any rejection to `next(err)`,
// which reaches index.js's existing global error-handling middleware and
// returns a normal error response instead of crashing the server.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
