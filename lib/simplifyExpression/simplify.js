const math = require('mathjs')
const checks = require('../checks')
const print = require('../util/print')
const removeUnnecessaryParens = require('../util/removeUnnecessaryParens')
const stepThrough = require('./stepThrough')
const flattenOperands = require('../util/flattenOperands')

// Given a mathjs expression node, steps through simplifying the expression.
// Returns the simplified expression node.
function simplify(node, debug = false, ctx) {
  if (checks.hasUnsupportedNodes(node)) {
    return node
  }

  const steps = stepThrough(node, debug, ctx)
  let simplifiedNode = null

  if (steps.length > 0) {
    simplifiedNode = steps.pop().newNode

  } else {
    // removing parens isn't counted as a step, so try it here
    simplifiedNode = removeUnnecessaryParens(node, true)
  }

  // unflatten the node.
  return unflatten(simplifiedNode)
}

// Unflattens a node so it is in the math.js style, by printing and parsing it
// again
function unflatten(node) {
  // Possible improvement: Move to the top of file.
  const mathsteps = require('../../index.js')
  return mathsteps.parseText(print.ascii(node))
}


module.exports = simplify
