const Node = require('../node')

const NODE_ONE = Node.Creator.constant(1)

class EquationInfo {
  constructor(equationObj, unknownVariable) {
    this.equationObj     = equationObj
    this.unknownVariable = unknownVariable

    // TODO: Review it.
    this.stackPowers = []
  }

  _getCurrentPowerNode() {
    let rv = null

    switch (this.stackPowers.length) {
      case 0: {
        rv = NODE_ONE
        break
      }

      case 1: {
        rv = this.stackPowers[0]
        break
      }

      default: {
        rv = Node.Creator.operator('*', this.stackPowers)
      }
    }

    return rv
  }

  _enterPowerNode(powerNode) {
    this.stackPowers.push(powerNode)
  }

  _leavePowerNode() {
    this.stackPowers.pop()
  }

  _onUnknownVariable() {
    console.log(this.unknownVariable, '^ (', this._getCurrentPowerNode().toString(), ')')
  }

  _analyzeNode(node) {
    if (Node.Type.isParenthesis(node)) {
      // (...) - go on into parenthesis.
      this._analyzeNode(node.content)

    } else if (Node.Type.isSymbol(node)) {
      if (node.name === this.unknownVariable) {
        // Unknown variable - update equation stats.
        this._onUnknownVariable()
      }

    } else if (Node.Type.isConstant(node)) {
      // Constant node - do nothing.

    } else if (Node.Type.isOperator(node)) {
      // a op b
      switch (node.op) {
        case '+':
        case '-': {
          node.args.forEach((oneTermNode) => {
            this._analyzeNode(oneTermNode)
          })
          break
        }

        case '*': {
          // (...) * (...)
          throw Error('not implemented')
          break
        }

        case '/': {
          // (...) / (...)
          throw Error('not implemented')
          break
        }

        case '^': {
          // (...) ^ (...)
          // TODO: Handle a^x .
          this._enterPowerNode(node.args[1])
          this._analyzeNode(node.args[0])
          this._leavePowerNode()

          break
        }

        default: {
          throw Error('unhandled node: ' + node.toString())
        }
      }

    } else if (Node.Type.isFunction(node)) {
      // f(...)

    } else {
      throw Error('unhandled node: ' + node.toString())
    }
  }

  run() {
    this._analyzeNode(this.equationObj.leftNode)
    this._analyzeNode(this.equationObj.rightNode)
  }
}

module.exports = function (equationObj, unknownVariable) {
  const equationInfo = new EquationInfo(equationObj, unknownVariable)
  equationInfo.run()
  return equationInfo
}
