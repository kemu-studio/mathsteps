const calculateNumericalValue = require('./calculateNumericalValue')

const SIMPLIFICATION_FUNCTIONS = [
  // sqrt(2) gives 1.41421356237309505 etc.
  calculateNumericalValue,
]

// Look for kemu step(s) to perform on a node. Returns a Node.Status object.
module.exports = function basics(node, expressionCtx) {
  let rv = null

  if (expressionCtx && expressionCtx.isNumerical()) {
    for (let i in SIMPLIFICATION_FUNCTIONS) {
      const nodeStatus = SIMPLIFICATION_FUNCTIONS[i](node)
      if (nodeStatus) {
        rv = nodeStatus
        break
      }
    }
  }
  return rv
}
