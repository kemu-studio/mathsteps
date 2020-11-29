const NthRoot = require('./nthRoot')
const Node = require('../../node')

const FUNCTIONS = [
  NthRoot.nthRoot,
]

// Searches through the tree, and evaluates
// functions (e.g. abs(-4)) if possible.
// Returns a Node.Status object.
// Evaluates a function call if possible. Returns a Node.Status object.
module.exports = function functions(node) {
  if (!Node.Type.isFunction(node)) {
    return Node.Status.noChange(node)
  }

  for (let i = 0; i < FUNCTIONS.length; i++) {
    const nodeStatus = FUNCTIONS[i](node)
    if (nodeStatus.hasChanged()) {
      return nodeStatus
    }
  }
  return Node.Status.noChange(node)
}
