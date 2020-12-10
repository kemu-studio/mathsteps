const stepThrough = require('./stepThrough')
const mathsteps  = require('../../index.js')

function simplifyExpressionString(expressionString, debug = false, expressionCtx = null) {
  let exprNode = null

  try {
    exprNode = mathsteps.parseText(expressionString)
  } catch (err) {
    return []
  }
  if (exprNode) {
    return stepThrough.oldApi(exprNode, {
      isDebugMode: debug,
      expressionCtx: expressionCtx
    })
  }
  return []
}

module.exports = simplifyExpressionString
