const SIMPLIFICATION_FUNCTIONS = [
  require('./collectLikeTerms'),

  // common function simplification e.g. sin(0) gives 0
  require('./commonFunctions'),

  // (a + b + c + ...) * x gives ac ax + bx + cx + ... etc.
  require('./distribute'),

  // sqrt(x^2) gives x or |x| (depends on domain)
  require('./sqrtFromPow'),

  // sqrt(n) - calculate if possible.
  require('./sqrtFromConstant'),

  // x*a/x gives a (TODO: Is it still needed?)
  require('./reduce'),

  // (a + b)^2 gives a^2 + 2ab + b^2 etc.
  require('./multiplyShortFormulas'),
]

// Look for kemu step(s) to perform on a node. Returns a Node.Status object.
module.exports = function basics(node, expressionCtx) {
  let rv = null

  for (let i in SIMPLIFICATION_FUNCTIONS) {
    const nodeStatus = SIMPLIFICATION_FUNCTIONS[i](node, expressionCtx)
    if (nodeStatus) {
      rv = nodeStatus
      break
    }
  }
  return rv
}
