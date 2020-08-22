const math         = require('mathjs')
const mathsteps    = require('../../index.js')
const EquationTerm = require('./EquationTerm')
const Node         = require('../node')
const stepThrough  = require('../simplifyExpression/stepThrough')
const simplifyCore = require('../simplifyExpression/kemuCommonSearch/simplifyCore.js')

const EMIT_LOGS_TO_CONSOLE = true
const MAX_ITERATIONS       = 20

class Equation {
  constructor(leftNode, rightNode, comparator, unknownVariable) {
    this.comparator      = comparator
    this.unknownVariable = unknownVariable
    this.left            = this._parseNode(leftNode)
    this.right           = this._parseNode(rightNode)

    // Log helpers.
    if (EMIT_LOGS_TO_CONSOLE) {
      this.logWidthForStepName = 0
      this.logWidthForEquation = 0
      this.logWidthForScheme   = 0
    }

    // Possible improvement: Move solutions stuff to another class?
    this.steps     = []
    this.solutions = null

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

  toString() {
    const rv = mathsteps.print(this.left.node)
             + ' '
             + this.comparator
             + ' '
             + mathsteps.print(this.right.node)
    return rv
  }

  getScheme() {
    const rv = this.left.toString()
             + this.comparator
             + this.right.toString()
    return rv
  }

  _logStep(msg) {
    if (EMIT_LOGS_TO_CONSOLE) {
      if (msg) {
        const columnMsg    = msg.padEnd(this.logWidthForStepName)
        const columnEq     = this.toString().padEnd(this.logWidthForEquation)
        const columnScheme = this.getScheme()

        // Possible improvement: Better column width adjust.
        this.logWidthForStepName = Math.max(this.logWidthForStepName, columnMsg.length)
        this.logWidthForEquation = Math.max(this.logWidthForEquation, columnEq.length)

        console.log('[ EquationSolver ]', columnMsg, '|', columnEq, '|', columnScheme)

      } else {
        console.log()
      }
    }
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

  swapSides() {
    this._logStep('swap sides')

    // Swap left and right nodes.
    [this.left  , this.right] =
    [this.right , this.left]
  }

  simplifyLeft() {
    this._logStep('simplify left')

    // TODO: Track steps.
    const steps = stepThrough(this.left.node)
    if (steps.length > 0) {
      const newNode = steps[steps.length - 1].newNode
      const newLeft = this._parseNode(newNode)
      this.left = newLeft
    }
  }

  simplifyRight() {
    this._logStep('simplify right')

    const steps = stepThrough(this.right.node)
    if (steps.length > 0) {
      const newNode = steps[steps.length - 1].newNode
      const newRight = this._parseNode(newNode)
      this.right = newRight
    }
  }

  applyStep(stepName, newNodes) {
    if (stepName === 'solution') {
      this.applySolution(newNodes.items)

    } else {
      // TODO: Handle comparator change.
      this._logStep(stepName)
      const newLeftNode  = newNodes.args[0]
      const newRightNode = newNodes.args[1]
      this.left  = this._parseNode(newLeftNode)
      this.right = this._parseNode(newRightNode)
    }
  }

  applyRules(poolOfRules, options = {}) {
    let goOn    = true
    let iterIdx = 0

    while (goOn) {
      this._logStep()

      // Simplify both side before each step if needed.
      if (options && options.simplifyBeforeEachStepEnabled) {
        this.simplifyLeft()
        this.simplifyRight()
      }

      // TODO: Handle other comparators.
      const eqNode = new math.FunctionNode('EQ', [this.left.node, this.right.node])
      const steps  = simplifyCore(eqNode, poolOfRules, null, {stopOnFirstStep: true})

      if (steps.length > 0) {
        this.applyStep(steps[0].ruleApplied.id, steps[0].nodeAfter)

        if (this.isSolved()) {
          // Equation is solved.
          // Don't go on anymore.
          goOn = false
        }
      } else {
        // No any rules applied.
        // We stucks without solution for now.
        goOn = false
      }

      // Go to next iteration.
      iterIdx++
      if (iterIdx > MAX_ITERATIONS) {
        throw Error('too many steps')
      }
    }
  }

  applySolution(solutions) {
    this._logStep('solution found', solutions.toString())
    this.solutions = solutions
  }

  isSolved() {
    return (this.solutions != null)
  }
}

module.exports = Equation
