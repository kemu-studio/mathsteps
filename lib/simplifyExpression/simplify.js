const print = require('../util/print')
const stepThrough = require('./stepThrough')

// Given a mathjs expression node, steps through simplifying the expression.
// Returns the simplified expression node.
function simplify(node, options) {
  return unflatten(stepThrough.newApi(node, options))
}

// Unflattens a node so it is in the math.js style, by printing and parsing it
// again
function unflatten(node) {
  // Possible improvement: Move to the top of file.
  const mathsteps = require('../../index.js')
  return mathsteps.parseText(print.ascii(node))
}


module.exports = simplify
