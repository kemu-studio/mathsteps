const {math} = require('../../../config')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')

// Converts a decimal number to fraction
// e.g. 3.14 -> 314/100
function convertDecimalToFraction(node, simplifyCtx) {
  let rv = null

  const isNumericalMode = simplifyCtx.expressionCtx
    ? simplifyCtx.expressionCtx.isNumerical()
    : false

  if (!isNumericalMode &&
      Node.Type.isConstant(node) &&
      math.isNumeric(node.value) &&
      !math.isInteger(node.value)) {

    // Node is non-integer constant e.g. 3.14.
    const fractionValues  = node.value.toFraction()
    const numeratorNode   = Node.Creator.constant(fractionValues[0])
    const denominatorNode = Node.Creator.constant(fractionValues[1])

    const newNode = Node.Creator.operator('/', [numeratorNode, denominatorNode])

    rv = {
      changeType: ChangeTypes.KEMU_DECIMAL_TO_FRACTION,
      rootNode: newNode
    }
  }

  return rv
}

module.exports = convertDecimalToFraction
