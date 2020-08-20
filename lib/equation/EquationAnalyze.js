const mathsteps = require('../../index.js')

const Node = require('../node')

const NODE_ONE = Node.Creator.constant(1)

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

class Equation {
  constructor(leftNode, rightNode, comparator, unknownVariable) {
    this.comparator      = comparator
    this.unknownVariable = unknownVariable
    this.left            = this._parseNode(leftNode)
    this.right           = this._parseNode(rightNode)

    //console.log(this.left.toString(), comparator, this.right.toString())
  }

  static createFromString(text, unknownVariable) {
    // TODO: Handle inequalities: <, >, <, =, >=.
    // TODO: Validate input.
    const comparator   = '='
    const separatorIdx = text.indexOf(comparator)
    const leftAsText   = text.substr(0, separatorIdx)
    const rightAsText  = text.substr(separatorIdx + 1)

    const leftNode  = mathsteps.parseText(leftAsText)
    const rightNode = mathsteps.parseText(rightAsText)

    return new Equation(leftNode, rightNode, comparator, unknownVariable)
  }

  _parseNode(node) {
    let rv = null

    if (!Node.Type.doesContainSymbol(node, this.unknownVariable)) {
      // Node does not contain unknown variable.
      // Treat as constant
      rv = EquationTerm.createConstant(node)

    } else {
      // Node contains unknown variable.
      // Dispatch node type.
      if (Node.Type.isParenthesis(node)) {
        // (...) - go on into parenthesis.
        rv = this._parseNode(node.content)

      } else if (Node.Type.isSymbol(node)) {
        // x = W1(x)
        rv = EquationTerm.createPolynomial(node, 1)

      } else if (Node.Type.isFunction(node)) {
        // Known function.
        // f(x)
        rv = EquationTerm.createFunction(node)

      } else if (Node.Type.isUnaryMinus(node)) {
        // -f(x)
        rv = EquationTerm.neg(this._parseNode(node.args[0]))

      } else if (Node.Type.isOperator(node)) {
        // Complex node.
        // Perform arithmetic on child equation terms recursively.
        if (node.args.length === 2) {
          const a = this._parseNode(node.args[0])
          const b = this._parseNode(node.args[1])

          switch (node.op) {
            case '+': rv = EquationTerm.add(a, b); break
            case '-': rv = EquationTerm.sub(a, b); break
            case '*': rv = EquationTerm.mul(a, b); break
            case '/': rv = EquationTerm.div(a, b); break
            case '^': rv = EquationTerm.pow(a, b); break
          }
        }
      }
    }

    if (rv == null) {
      throw Error('unhandled node: ' + node.toString())
    }

    return rv
  }
}

class EquationSolveManager {
  constructor() {
    this.solveFunctionsMap = {}
  }

  registerSolveFunction(pattern, solveFunction) {
    this.solveFunctionsMap[pattern] = solveFunction
  }

  solveEquation(equation) {
    // Build equation pattern.
    // Example: 'x^2 + 2x = -1' gives 'W(x)=C'
    const pattern = equation.left.toString()
                  + equation.comparator
                  + equation.right.toString()

    // Search for solve function for given pattern.
    const solveFunction = this.solveFunctionsMap[pattern]

    if (solveFunction == null) {
      throw Error(`no solver for equation: '${pattern}'`)
    }

    // Run solve function.
    return solveFunction(equation)
  }
}

const equationSolveManager = new EquationSolveManager()

module.exports = {
  Equation: Equation,
  EquationTerm: EquationTerm,
  EquationSolveManager: equationSolveManager,
}

//function (equationObj, unknownVariable) {
//  const equation = new Equation(equationObj.leftNode, equationObj.rightNode, '=', unknownVariable)
//  return equation
//}