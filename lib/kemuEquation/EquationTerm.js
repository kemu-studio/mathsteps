const math = require('mathjs')
const Node = require('../node')

const EQUATION_TERM_TYPES = {
  constant: 'C',
  polynomial: 'W(x)',
  function: 'f(x)',
}

class EquationTerm {
  constructor(type, node, data) {
    this.type = type
    this.node = node
    this.data = data
  }

  static createConstant(node) {
    return new EquationTerm('constant', node)
  }

  static createPolynomial(node) {
    return new EquationTerm('polynomial', node)
  }

  static createFunction(node) {
    return new EquationTerm('function', node)
  }

  static operator2(op, a, b) {
    const arithmeticMap = {
      // C op C
      'constant+constant': 'constant',
      'constant-constant': 'constant',
      'constant*constant': 'constant',
      'constant/constant': 'constant',
      'constant^constant': 'constant',

      // W(x) op W(x)
      'polynomial+polynomial': 'polynomial',
      'polynomial-polynomial': 'polynomial',
      'polynomial*polynomial': 'function',
      'polynomial/polynomial': 'function',   // TODO: Homographic?
      'polynomial^polynomial': 'function',   // x^x like.

      // W(x) op C
      'polynomial+constant': 'polynomial',
      'polynomial-constant': 'polynomial',
      'polynomial*constant': 'polynomial',
      'polynomial/constant': 'polynomial',
      'polynomial^constant': 'polynomial', // TODO: Review it.

      // C op W(x)
      'constant+polynomial': 'polynomial',
      'constant-polynomial': 'polynomial',
      'constant*polynomial': 'polynomial',
      'constant/polynomial': 'function',   // TODO: Homographic?
      'constant^polynomial': 'function',   // TODO: exponential?
    }

    const newNode = Node.Creator.operator(op, [a.node, b.node])
    const hash    = a.type + op + b.type
    let   newType = null

    if ((a.type === 'function') || (b.type === 'function')) {
      newType = 'function'
    } else {
      newType = arithmeticMap[hash]
    }

    if (newType == null) {
      throw Error('unhandled node types:' + hash)
    }

    // TODO: Handle data?
    // TODO: Handle polynomial degree?
    return new EquationTerm(newType, newNode)
  }

  static add(a, b) {
    return EquationTerm.operator2('+', a, b)
  }

  static sub(a, b) {
    return EquationTerm.operator2('-', a, b)
  }

  static mul(a, b) {
    return EquationTerm.operator2('*', a, b)
  }

  static div(a, b) {
    return EquationTerm.operator2('/', a, b)
  }

  static pow(a, b) {
    return EquationTerm.operator2('^', a, b)
  }

  static neg(a) {
    const newNode = Node.Creator.unaryMinus(a.node)
    return new EquationTerm(a.type, newNode)
  }

  toString() {
    const typeToText = {
      constant: 'C',
      polynomial: 'W(x)',
      function: 'f(x)',
    }
    return typeToText[this.type]
  }
}

module.exports = EquationTerm
