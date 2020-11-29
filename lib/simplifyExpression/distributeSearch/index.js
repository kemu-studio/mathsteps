const arithmeticSearch = require('../arithmeticSearch')
const clone = require('../../util/clone')
const collectAndCombineSearch = require('../collectAndCombineSearch')
const rearrangeCoefficient = require('../basicsSearch/obsolete/rearrangeCoefficient')

const ChangeTypes = require('../../ChangeTypes')
const Negative = require('../../Negative')
const Node = require('../../node')

// Distributes through parenthesis.
// e.g. 2(x+3) -> (2*x + 2*3)
// e.g. -(x+5) -> (-x + -5)
// Returns a Node.Status object.
function distribute(node, expressionCtx, parentNode) {
  if (Node.Type.isUnaryMinus(node)) {
    return distributeUnaryMinus(node, expressionCtx, parentNode)
  } else {
    return Node.Status.noChange(node)
  }
}

// Distributes unary minus into a parenthesis node.
// e.g. -(4*9*x^2) --> (-4 * 9  * x^2)
// e.g. -(x + y - 5) --> (-x + -y + 5)
// Returns a Node.Status object.
function distributeUnaryMinus(node, expressionCtx, parentNode) {
  if (!Node.Type.isUnaryMinus(node)) {
    return Node.Status.noChange(node)
  }

  if ((parentNode != null) && (parentNode.op === '^')) {
    // We're inside arg of base^exp node.
    // Distinguish between base and exp args.
    let expNode = parentNode.args[1]

    if (expNode == node) {
      // x^(-y) - don't touch exponent for now.
      // We'll simplify in sqrt-pow simplify steps.
      return Node.Status.noChange(node)
    }
  }

  const unaryContent = node.args[0]
  const content      = unaryContent

  if (!Node.Type.isOperator(content)) {
    return Node.Status.noChange(node)
  }

  const newContent = clone(content)
  node.changeGroup = 1

  // For multiplication and division, we can push the unary minus in to
  // the first argument.
  // e.g. -(2/3) -> (-2/3)    -(4*9*x^2) --> (-4 * 9  * x^2)
  if (content.op === '*' || content.op === '/') {
    newContent.args[0] = Negative.negate(newContent.args[0])
    newContent.args[0].changeGroup = 1
    const newNode = newContent
    return Node.Status.nodeChanged(
      ChangeTypes.DISTRIBUTE_NEGATIVE_ONE, node, newNode, false)

  } else if (content.op === '+') {
    // Now we know `node` is of the form -(x + y + ...).
    // We want to now return (-x + -y + ....)
    // If any term is negative, we make it positive it right away
    // e.g. -(2-4) => -2 + 4
    const newArgs = newContent.args.map(arg => {
      const newArg = Negative.negate(arg)
      newArg.changeGroup = 1
      return newArg
    })
    newContent.args = newArgs
    const newNode = newContent
    return Node.Status.nodeChanged(
      ChangeTypes.DISTRIBUTE_NEGATIVE_ONE, node, newNode, false)
  } else {
    return Node.Status.noChange(node)
  }
}

module.exports = distribute
