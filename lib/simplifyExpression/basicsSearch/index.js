/*
 * Performs simpifications that are more basic and overaching like (...)^0 => 1
 * These are always the first simplifications that are attempted.
 */

const SIMPLIFICATION_FUNCTIONS = [
  // convert decimal to fraction in non-numerical mode
  // 3.14 -> 314/100
  require('./convertDecimalToFraction'),

  // Rule based changes.
  require('./commonRules'),
]

// Look for basic step(s) to perform on a node. Returns a Node.Status object.
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
