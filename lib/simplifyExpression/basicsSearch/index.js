/*
 * Performs simpifications that are more basic and overaching like (...)^0 => 1
 * These are always the first simplifications that are attempted.
 */

const Node = require('../../node')

const SIMPLIFICATION_FUNCTIONS = [
  // convert decimal to fraction in non-numerical mode
  // 3.14 -> 314/100
  require('./convertDecimalToFraction'),

  // Rule based changes.
  require('./commonRules'),
]

// Look for basic step(s) to perform on a node. Returns a Node.Status object.
module.exports = function basics(node, expressionCtx) {
  for (let i = 0; i < SIMPLIFICATION_FUNCTIONS.length; i++) {
    const nodeStatus = SIMPLIFICATION_FUNCTIONS[i](node, expressionCtx)
    if (nodeStatus.hasChanged()) {
      return nodeStatus
    } else {
      node = nodeStatus.newNode
    }
  }
  return Node.Status.noChange(node)
}
