const stepThrough = require('./stepThrough')
const mathsteps  = require('../../index.js')

function simplifyExpressionString(expressionString, debug = false, expressionCtx = null) {
  let exprNode
  try {
    exprNode = mathsteps.parseText(expressionString)
  } catch (err) {
    return []
  }
  if (exprNode) {
    return stepThrough(exprNode, {
      isDebugMode: debug,
      expressionCtx: expressionCtx
    })
  }
  return []
}

module.exports = simplifyExpressionString
