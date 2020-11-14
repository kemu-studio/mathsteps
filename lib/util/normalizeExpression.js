const print = require('./print')
const mathsteps = require('../../index.js')

function normalizeExpression(expressionString) {
  let rv = '[?]'

  try {
    let expressionNode = mathsteps.parseText(expressionString)
    rv = mathsteps.print(expressionNode)
  } catch (err) {
    rv = '[error]'
  }

  return rv
}

module.exports = normalizeExpression
