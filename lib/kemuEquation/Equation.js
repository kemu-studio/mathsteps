const math         = require('mathjs')
const mathsteps    = require('../../index.js')
const EquationTerm = require('./EquationTerm')
const Node         = require('../node')
const stepThrough  = require('../simplifyExpression/stepThrough')
const simplifyCore = require('../simplifyExpression/kemuCommonSearch/simplifyCore.js')
const print        = require('../util/print')
const clone        = require('../util/clone')

const flattenOperands = require('../util/flattenOperands')

const NODE_TRUE  = Node.Creator.symbol('true')
const NODE_FALSE = Node.Creator.symbol('false')

const EMIT_LOGS_TO_CONSOLE = false
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
      this.logLastColumnEq     = null
    }

    // Possible improvement: Move solutions stuff to another class?
    this.steps     = []
    this.solutions = null

    // console.log(this.left.toString(), comparator, this.right.toString())
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

  _log() {
    if (EMIT_LOGS_TO_CONSOLE) {
      process.stdout.write('[ EquationSolver ] ')
      console.log.apply(console, arguments)
    }
  }

  _logStep(msg, showRepeatedSteps = true) {
    if (EMIT_LOGS_TO_CONSOLE) {
      if (msg) {
        const columnEq = this.toString().padEnd(this.logWidthForEquation)

        if (showRepeatedSteps || (columnEq != this.logLastColumnEq)) {
          const columnMsg    = msg.padEnd(this.logWidthForStepName)
          const columnScheme = this.getScheme()

          // Possible improvement: Better column width adjust.
          this.logWidthForStepName = Math.max(this.logWidthForStepName, columnMsg.length)
          this.logWidthForEquation = Math.max(this.logWidthForEquation, columnEq.length)
          this.logLastColumnEq     = columnEq

          this._log(columnMsg, '|', columnEq, '|', columnScheme)
        }

      } else {
        console.log()
      }
    }
  }

  _unflattenNode(node) {
    // Possible improvement: Move to better place?
    // Possible improvement: Optimize it.
    return math.parse(print.ascii(node))
  }

  _simplifySide(side) {
    // TODO: Track steps.
    let rv = side

    // TODO: Why we need full reparse here?
    // TODO: Optimize it.
    // Example: Simplify left on equation: (x+2)^2 -x^2 - 4(x+1) = 0
    const exprText = mathsteps.print(side.node)
    const exprObj  = mathsteps.parseText(exprText)
    const steps    = mathsteps.simplifyExpression(exprText)

    if (steps.length > 0) {
      const newNode = this._unflattenNode(steps[steps.length - 1].newNode)
      rv = this._parseNode(newNode)
    }

    return rv
  }

  _parseNode(node) {
    let rv = null

    // TODO: Review flatten/unflatten mess.
    node = this._unflattenNode(node)

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
      throw Error(`unhandled node (${node.op}): ${node}`)
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
    this.left = this._simplifySide(this.left)
    this._logStep('simplify left', false)
  }

  simplifyRight() {
    this.right = this._simplifySide(this.right)
    this._logStep('simplify right', false)
  }

  applyStep(stepName, newNodes) {
    if (stepName === 'solution') {
      this.applySolution(newNodes.items)

    } else {
      // TODO: Handle comparator change.
      const newLeftNode  = newNodes.args[0]
      const newRightNode = newNodes.args[1]
      this.left  = this._parseNode(newLeftNode)
      this.right = this._parseNode(newRightNode)

      this._logStep(stepName)
    }
  }

  applyRules(poolOfRules, options = {}) {
    let goOn    = true
    let iterIdx = 0

    const simplifyOptions = {
      stopOnFirstStep: true,
      unknownVariable: this.unknownVariable
    }

    while (goOn) {
      this._logStep('...', false)

      // Simplify both side before each step if needed.
      if (options && options.simplifyBeforeEachStepEnabled) {
        this.simplifyLeft()
        this.simplifyRight()
      }

      // TODO: Handle other comparators.
      const eqNode = new math.FunctionNode('EQ', [this.left.node, this.right.node])
      const steps  = simplifyCore(eqNode, poolOfRules, null, simplifyOptions)

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

  _isOkAsSolution(node) {
    let rv = true

    if (Node.Type.isNthRoot(node) &&
        Node.Type.kemuIsConstantNegative(node.args[0])) {
      // Skip sqrt(-n) like.
      // Possible improvement: Handle complex numbers?
      rv = false;

    } else if (Node.Type.isNthRoot(node) &&
               Node.Type.isUnaryMinus(node.args[0]) &&
               Node.Type.kemuIsConstantPositive(node.args[0].args[0])) {
      // Skip sqrt(-n) like.
      // Possible improvement: Handle complex numbers?
      rv = false;

    } else if (node.args) {
      for (let idx in node.args) {
        if (!this._isOkAsSolution(node.args[idx])) {
          // At least one child-node can't be a solution.
          // Don't go on anymore.
          rv = false;
          break
        }
      }
    }

    return rv
  }

  applySolution(solutions) {
    // TODO: Track simplify steps.
    this.solutions = []

    solutions.forEach((oneItem) => {
      const steps = stepThrough(oneItem)

      if (steps.length > 0) {
        oneItem = this._unflattenNode(steps[steps.length - 1].newNode)
      }

      if (this._isOkAsSolution(oneItem)) {
        this.solutions.push(oneItem)
      } else {
        this._log('skipped solution  |', mathsteps.print(oneItem))
      }
    })

    // Distinghuish between unsolved and no-solutions states.
    if (this.solutions.length === 0) {
      this.solutions = [NODE_FALSE]
    }

    this._log('solution found    |', this.getSolutionsAsText())
  }

  getSolutions() {
    return this.solutions
  }

  getSolutionsAsText() {
    let rv = this.unknownVariable + ' = '

    if (this.isSolved()) {
      // Equation is solved, go on.
      if (this.solutions.length === 1) {
        // There is only one solution.
        rv += mathsteps.print(this.solutions[0])

      } else {
        // There is more than one solution, render them one-by-one.
        let sep = ''
        rv += '['
        this.solutions.forEach((oneSolution) => {
          rv += sep + mathsteps.print(oneSolution)
          sep = ', '
        })
        rv += ']'
      }

    } else {
      // Not solved - solution is unknown.
      rv += '?'
    }

    return rv
  }

  isSolved() {
    return (this.solutions != null)
  }
}

module.exports = Equation
