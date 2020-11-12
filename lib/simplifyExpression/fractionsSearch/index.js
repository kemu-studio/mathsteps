/*
 * Performs simpifications on fractions: adding and cancelling out.
 *
 * Note: division is represented in mathjs as an operator node with op '/'
 * and two args, where arg[0] is the numerator and arg[1] is the denominator

// This module manipulates fractions with constants in the numerator and
// denominator. For more complex/general fractions, see Fraction.js

 */

const Node = require('../../node')
const TreeSearch = require('../../TreeSearch')

const SIMPLIFICATION_FUNCTIONS = [
  // e.g. 8/12  ->  2/3 (divide by GCD 4)
  require('./divideByGCD'),
  // e.g. 2x/4 -> x/2 (divideByGCD but for coefficients of polynomial terms)
  require('./simplifyPolynomialFraction'),
  // e.g. (2x * 5) / 2x  ->  5
  require('./cancelLikeTerms'),
]

const search = TreeSearch.preOrder(simplifyFractions)

// Look for step(s) to perform on a node. Returns a Node.Status object.
function simplifyFractions(node) {
  for (let i = 0; i < SIMPLIFICATION_FUNCTIONS.length; i++) {
    const nodeStatus = SIMPLIFICATION_FUNCTIONS[i](node)
    if (nodeStatus.hasChanged()) {
      return nodeStatus
    } else {
      node = nodeStatus.newNode
    }
  }
  return Node.Status.noChange(node)
}


module.exports = search
