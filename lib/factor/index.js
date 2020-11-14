const mathsteps   = require('../../index.js')
const stepThrough = require('./stepThrough')

function factorString(expressionString, debug = false) {
  let node
  try {
    node = mathsteps.parseText(expressionString)
  } catch (err) {
    return []
  }

  if (node) {
    return stepThrough(node, debug)
  }
  return []
}

module.exports = factorString
