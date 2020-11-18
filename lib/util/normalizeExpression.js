const print = require('./print')

function normalizeExpression(expressionString) {
  let rv = '[?]'

  try {
    const mathsteps = require('../../index.js')
    let expressionNode = mathsteps.parseText(expressionString)
    rv = mathsteps.print(expressionNode)
  } catch (err) {
    rv = '[error]'
  }

  return rv
}

module.exports = normalizeExpression
