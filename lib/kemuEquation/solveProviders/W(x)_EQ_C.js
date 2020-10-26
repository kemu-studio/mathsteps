const Equation       = require('../Equation')
const EquationSolver = require('../EquationSolver')
const Node           = require('../../node')
const flatten        = require('../../util/flattenOperands')
const print          = require('../../util/print')
const stepThrough    = require('../../simplifyExpression/stepThrough')
const math           = require('mathjs')

const NODE_MINUS_ONE = Node.Creator.constant(-1)
const NODE_ZERO      = Node.Creator.constant(0)
const NODE_ONE       = Node.Creator.constant(1)
const NODE_TWO       = Node.Creator.constant(2)
const NODE_FOUR      = Node.Creator.constant(4)
const NODE_FALSE     = Node.Creator.symbol('false')

// TODO: Move to better place?
function _getNodeDegree(node, unknownVariable) {
  let rv = null

  if (Node.Type.isSymbol(node) && (node.name === unknownVariable)) {
    // Node is just a variable without any power: x.
    rv = NODE_ONE

  } else if (Node.Type.isOperator(node, '^') &&
             Node.Type.isNamedSymbol(node.args[0], unknownVariable)) {

    // Powered variable: x^n
    rv = node.args[1]

  } else {
    throw `unexpected node (${node.op}): ${node}`
  }

  return rv
}

function _parsePolynomial(node, unknownVariable, rv) {
  // Create new coefficient array if needed.
  if (rv == null) {
    rv = {
      doAllExponentsAreInteger: true,
      coeffNodes: [0]
    }
    node = flatten(node)
  }

// console.log("-> _parsePolynomial", node.toString(), rv)

  let c = null
  let n = null

  if (Node.Type.isOperator(node)) {
    // x op y
    switch (node.op) {
      case '+': {
        // ... an x^n + am x^m ...
        node.args.forEach((oneTerm) => {
          _parsePolynomial(oneTerm, unknownVariable, rv)
        })
        break
      }

      case '*': {
        // c * x^n
        if (node.args.length !== 2) {
          throw `unexpected node (${node.op}): ${node}`
        }

        const arg1 = node.args[0]
        const arg2 = node.args[1]

        if (Node.Type.doesContainSymbol(arg2, unknownVariable)) {
          c = arg1
          n = _getNodeDegree(arg2, unknownVariable)

        } else {
          c = arg2
          n = _getNodeDegree(arg1, unknownVariable)
        }

        break
      }

      case '^': {
        // x^n (without coefficient)
        c = NODE_ONE
        n = _getNodeDegree(node, unknownVariable)
        break
      }

      default: {
        throw `unexpected node (${node.op}): ${node}`
      }
    }

  } else if ((Node.Type.isSymbol(node)) &&
             (node.name === unknownVariable)) {
    // Just a lonely variable:
    // x = 1 * x^1
    c = NODE_ONE
    n = NODE_ONE

  } else if (Node.Type.isUnaryMinus(node)) {
    // Possible improvement: Simplify it, more general solution?
    if (Node.Type.isNamedSymbol(node.args[0], unknownVariable)) {
      // -x
      c = NODE_MINUS_ONE
      n = NODE_ONE

    } else if (Node.Type.isOperator(node.args[0], '^') &&
               Node.Type.isNamedSymbol(node.args[0].args[0], unknownVariable)) {
      // -x^n
      c = NODE_MINUS_ONE
      n = _getNodeDegree(node.args[0], unknownVariable)
    }

  } else if ((Node.Type.isUnaryMinus(node)) &&
             (Node.Type.isSymbol(node.args[0])) &&
             (node.args[0].name === unknownVariable)) {
    // -x
    c = NODE_MINUS_ONE
    n = NODE_ONE
  }

  if (c && n) {
    if (Node.Type.kemuIsConstantInteger(n)) {
      // Collect found coefficients in result array.
      // Possible improevement: Avoid huge array for x^987837489234324 like.
      n = parseInt(n.value)
      rv.coeffNodes[n] = c

    } else {
      // Non-constant / non-integer polynomial exponent.
      rv.doAllExponentsAreInteger = false
    }
  }

//  console.log("<- _parsePolynomial", node.toString(), rv)

  return rv
}

function _createNodePolynomialTerm(c, n, x) {
  let rv = null

  // Possible improvement: Bignumber exponent (n) ?
  switch (n) {
    case 0: {
      // c * x^0 = c
      rv = c
      break
    }

    case 1: {
      // c * x^1 = c*x
      rv = x
      break
    }

    default: {
      const xPowN = Node.Creator.operator('^', [x, Node.Creator.constant(n)])

      if (Node.Type.kemuIsConstantInteger(c, 1)) {
        // 1 * x^n
        rv = xPowN

      } else {
        // General case: c * x^n
        rv = Node.Creator.operator('*', [c, xPowN])
      }
    }
  }

  return rv
}

function _simplifyNode(node) {
  const steps = stepThrough(node)

  if (steps.length > 0) {
    node = (steps[steps.length - 1].newNode)
  }

  return {node, steps}
}

EquationSolver.registerSolveFunction('W(x)=C', (equation) => {
  // Pool of known transformations.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx + a , a2)' , r: 'EQ(fx , a2 - a)' , id: 'move_c_to_right'},
    {l: 'EQ(fx - a , a2)' , r: 'EQ(fx , a2 + a)' , id: 'move_c_to_right'},

    {l: 'EQ(a + fx, a2)' , r: 'EQ( fx , a2 - a)' , id: 'move_c_to_right'},
    {l: 'EQ(a - fx, a2)' , r: 'EQ(-fx , a2 - a)' , id: 'move_c_to_right'},

    {l: 'EQ(a  * fx , a2)' , r: 'EQ(fx , a2 / a)' , id: 'div_by_c'},
    {l: 'EQ(fx * a  , a2)' , r: 'EQ(fx , a2 * a)' , id: 'div_by_c'},
    {l: 'EQ(fx / a  , a2)' , r: 'EQ(fx , a2 * a)' , id: 'mul_by_c'},

    // Linear equation: W1(x) = C
    {l: 'EQ(a + x, a2)' , r: 'EQ( x , a2 - a)' , id: 'move_c_to_right'},
    {l: 'EQ(a - x, a2)' , r: 'EQ(-x , a2 - a)' , id: 'move_c_to_right'},

    {l: 'EQ(a x , a2)' , r: 'EQ(x , a2 / a)' , id: 'div_by_c'},
    {l: 'EQ(x/a , a2)' , r: 'EQ(x , a2 * a)' , id: 'mul_by_c'},
    {l: 'EQ(- x , a2)' , r: 'EQ(x , -a2)'    , id: 'mul_by_minus_one'},

    {l: 'EQ(x, a1)', r: '[a1]' , id: 'solution'},

    // f(x)^a = 0 gives f(x) = 0
    {l: 'EQ(fx^a , 0)' , r: 'EQ(fx , 0)' , id: 'remove_pow'},

    // TODO: General handler for x^n = C
    {l: 'EQ(x^2, a1)', r: '[-sqrt(a1), sqrt(a1)]'           , id: 'solution'},
    {l: 'EQ(x^3, a1)', r: '[nthRoot(a1,3)]'                 , id: 'solution'},
    {l: 'EQ(x^4, a1)', r: '[-nthRoot(a1,4), nthRoot(a1,4)]' , id: 'solution'},
    {l: 'EQ(x^5, a1)', r: '[nthRoot(a1,5)]'                 , id: 'solution'},
    {l: 'EQ(x^6, a1)', r: '[-nthRoot(a1,6), nthRoot(a1,6)]' , id: 'solution'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })

  if (!equation.isSolved()) {
    // TODO: Move to another W2(x)=C handler.
    const polyObj = _parsePolynomial(equation.left.node, equation.unknownVariable)

    if (polyObj.doAllExponentsAreInteger) {
      if (polyObj.coeffNodes.length === 3) {
        // W2(x) = ax^2 + bx = c = quadratic equation.
        const a = polyObj.coeffNodes[2]
        const b = polyObj.coeffNodes[1]
        const c = Node.Creator.unaryMinus(equation.right.node)

        if (0) {
          console.log('A :', a)
          console.log('B :', b)
          console.log('C :', c)
        }

        if (a && b && c) {
          // Pure quadratic equation: ax^2 + bx = c
          // We're going to solve by delta scheme.
          // Calculate helper values.
          const minusB = Node.Creator.unaryMinus(b)                // -b
          const twoA   = Node.Creator.operator('*', [NODE_TWO, a]) // 2a

          // Calculate delta.
          let delta = Node.Creator.operator('-', [              // delta =
            Node.Creator.operator('^', [b, NODE_TWO]),          //   b^2
            Node.Creator.operator('*', [NODE_FOUR, a, c], true) // - 4ac
          ])

          let result     = _simplifyNode(delta)
          let deltaSteps = result.steps
          delta          = result.node

          // Classify delta sign.
          const isDeltaZero     = Node.Type.isZero(delta)
          const isDeltaPositive = Node.Type.kemuIsConstantPositive(delta)
          const isDeltaNegative = Node.Type.kemuIsConstantNegative(delta)

          // Caculate sqrt(delta)
          let sqrtDelta = Node.Creator.kemuCreateSqrt(delta)

          result             = _simplifyNode(sqrtDelta)
          sqrtDelta          = result.node
          let sqrtDeltaSteps = result.steps

          // Dispatch delta sign.
          let x1 = null
          let x2 = null

          let x1Steps = null
          let x2Steps = null

          if (isDeltaNegative) {
            // Delta is negative - there is no solutions.

          } else if (isDeltaZero) {
            // Delta is zero - there is exacly one solution.
            // Calculate solution: x
            // Possible improvement: Check delta sign.
            // x1 = -b/2a
            x1 = Node.Creator.operator('/', [minusB, twoA])

          } else {
            // The sign of delta is positive or unknown.
            // Apply general formulas for x1 and x2.

            // Calculate solution: x1
            // Possible improvement: Check delta sign.
            x1 = Node.Creator.operator('/', [                  // x1 =
              Node.Creator.operator('-', [minusB, sqrtDelta]), //  -b - sqrt(delta)
                                                               // -----------------
              twoA                                             //        2a
            ])

            // Calculate solution: x2
            // Possible improvement: Check delta sign.
            x2 = Node.Creator.operator('/', [                  // x2 =
              Node.Creator.operator('+', [minusB, sqrtDelta]), //  -b + sqrt(delta)
                                                               // -----------------
              twoA                                             //        2a
            ])
          }

          // Simplify solutions if any.
          const solutions = []

          if (x1) {
            result  = _simplifyNode(x1)
            x1      = result.node
            x1Steps = result.steps
            solutions.push(x1)
          }

          if (x2) {
            result  = _simplifyNode(x2)
            x2      = result.node
            x1Steps = result.steps
            solutions.push(x2)
          }

          // Log usage of delta scheme.
          equation._logStep('solving_quadratic', true, {
            a, b, c,
            delta, deltaSteps,
            isDeltaZero, isDeltaPositive, isDeltaNegative,
            sqrtDelta, sqrtDeltaSteps,
            x1, x2,
            x1Steps, x2Steps
          })

          // Apply solutions.
          equation.applySolution(solutions)
        }

      } else if (Node.Type.isZero(equation.right.node)) {
        // Wn(x) = 0 gives x * Wn-1(x) = 0
        const x = Node.Creator.symbol(equation.unknownVariable)

        // Build Wn-1(x) polynomial.
        const terms = []
        polyObj.coeffNodes.forEach((c, n) => {
          if (c) {
            terms.push(_createNodePolynomialTerm(c, n-1, x))
          }
        })

        // L = x * Wn-1(x)
        const Wnm1 = Node.Creator.operator('+', terms.reverse())
        const L    = Node.Creator.operator('*', [x, Wnm1])

        equation.applyStep('move_x_before', {args: [L, NODE_ZERO]})
      }
    }
  }
})
