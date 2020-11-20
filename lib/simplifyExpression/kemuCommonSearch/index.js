const Node = require('../../node')
const TreeSearch = require('../../TreeSearch')

const SIMPLIFICATION_FUNCTIONS = [
  // common function simplification e.g. sin(0) gives 0
  require('./commonFunctions'),

  // sqrt(x^2) gives x or |x| (depends on domain)
  require('./sqrtFromPow'),

  // sqrt(n) - calculate if possible.
  require('./sqrtFromConstant'),

  // (a*b*c*...)^n gives a^n + b^n + c^n + ...^n
  require('./powFactors'),

  // x*a/x gives a (TODO: Is it still needed?)
  require('./reduce'),

  // (a + b)^2 gives a^2 + 2ab + b^2 etc.
  require('./multiplyShortFormulas'),

  // (a + b + c + ...) * x gives ac ax + bx + cx + ... etc.
  // require('./distribute'),
]

const search = TreeSearch.preOrder(basics)

// Look for kemu step(s) to perform on a node. Returns a Node.Status object.
function basics(node, expressionCtx) {
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

module.exports = search
