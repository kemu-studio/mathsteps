const EquationSolver = require('../EquationSolver')
const Node           = require('../../node')
const flatten        = require('../../util/flattenOperands')

const NODE_MINUS_ONE = Node.Creator.constant(-1)
const NODE_ZERO      = Node.Creator.constant(0)
const NODE_ONE       = Node.Creator.constant(1)
const NODE_TWO       = Node.Creator.constant(2)
const NODE_FOUR      = Node.Creator.constant(4)

// TODO: Move to better place?
function _getNodeDegree(node, unknownVariable) {
  let rv = null

  if (Node.Type.isSymbol(node) && (node.name === unknownVariable)) {
    // Node is just a variable without any power: x.
    rv = NODE_ONE

  } else if ((Node.Type.isOperator(node, '^')) &&
             (Node.Type.isSymbol(node.args[0])) &&
             (node.args[0].name === unknownVariable)) {

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

  return rv
}

EquationSolver.registerSolveFunction('W(x)=C', (equation) => {
  // Pool of known transformations.
  const poolOfRules = [

    // Solve a1 x^2 + a2 x + a3 = 0 with delta scheme.
    // TODO: Deliver step-by-step description.
/*
    {
      id: 'solution',
      l: 'EQ(a1 x^2 + a2 x , a3)',
      r: '[(-a2 - sqrt(a2^2 + 4a1 a3)) / 2a1 ,' +
         ' (-a2 + sqrt(a2^2 + 4a1 a3)) / 2a1]'
    },
    {
      id: 'solution',
      l: 'EQ(a1 x^2 - a2 x , a3)',
      r: '[(a2 - sqrt(a2^2 + 4a1 a3)) / 2a1 ,' +
         ' (a2 + sqrt(a2^2 + 4a1 a3)) / 2a1]'
    },
    {
      id: 'solution',
      l: 'EQ(a1 x^2 - a2 x , a3)',
      r: '[(a2 - sqrt(a2^2 + 4a1 a3)) / 2a1 ,' +
         ' (a2 + sqrt(a2^2 + 4a1 a3)) / 2a1]'
    },
*/

    // Common rules.
    {l: 'EQ(fx + a1 , a2)' , r: 'EQ(fx , a2 - a1)' , id: 'move_c_to_right'},
    {l: 'EQ(fx - a1 , a2)' , r: 'EQ(fx , a2 + a1)' , id: 'move_c_to_right'},

    {l: 'EQ(a1 + fx, a2)' , r: 'EQ( fx , a2 - a1)' , id: 'move_c_to_right'},
    {l: 'EQ(a1 - fx, a2)' , r: 'EQ(-fx , a2 - a1)' , id: 'move_c_to_right'},

    {l: 'EQ(a1 * fx , a2)' , r: 'EQ(fx , a2 / a1)' , id: 'div_by_c'},
    {l: 'EQ(fx * a1 , a2)' , r: 'EQ(fx , a2 * a1)' , id: 'div_by_c'},
    {l: 'EQ(fx / a1 , a2)' , r: 'EQ(fx , a2 * a1)' , id: 'mul_by_c'},

    // Linear equation: W1(x) = C
    {l: 'EQ(a1 + x, a2)' , r: 'EQ( x , a2 - a1)' , id: 'move_c_to_right'},
    {l: 'EQ(a1 - x, a2)' , r: 'EQ(-x , a2 - a1)' , id: 'move_c_to_right'},

    {l: 'EQ(a1 x , a2)' , r: 'EQ(x , a2 / a1)' , id: 'div_by_c'},
    {l: 'EQ(x/a1 , a2)' , r: 'EQ(x , a2 * a1)' , id: 'mul_by_c'},
    {l: 'EQ( - x , a1)' , r: 'EQ(x , -a1)'     , id: 'mul_by_minus_one'},

    {l: 'EQ(x, a1)', r: '[a1]' , id: 'solution'},

    // f(x)^a = 0 gives f(x) = 0
    {l: 'EQ(fx^a , 0)' , r: 'EQ(fx , 0)' , id: 'remove_pow_from_left'},

    // General handler for x^n = C
    {l: 'EQ(x^2, a1)', r: '[-sqrt(a1), sqrt(a1)]'           , id: 'solution'},
    {l: 'EQ(x^3, a1)', r: '[nthRoot(a1,3)]'                 , id: 'solution'},
    {l: 'EQ(x^4, a1)', r: '[-nthRoot(a1,4), nthRoot(a1,4)]' , id: 'solution'},
    {l: 'EQ(x^5, a1)', r: '[nthRoot(a1,5)]'                 , id: 'solution'},
    {l: 'EQ(x^6, a1)', r: '[-nthRoot(a1,6), nthRoot(a1,6)]' , id: 'solution'},

    // TODO: General handler for 2c and 2c+1 cases (even/odd).
    // {l: 'EQ(x^c, a1)', r: '[-nthRoot(a1,c), nthRoot(a1,c)]' , id: 'solution'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })


  if (!equation.isSolved()) {
    // TODO: Move to another W2(x)=C handler.
    const polyObj = _parsePolynomial(equation.left.node, equation.unknownVariable)

    if (polyObj.doAllExponentsAreInteger && (polyObj.coeffNodes.length === 3)) {
      // Pure quadratic equation: ax^2 + bx = c
      // We're going to solve by delta scheme.
      const a = polyObj.coeffNodes[2]
      const b = polyObj.coeffNodes[1]
      const c = Node.Creator.unaryMinus(equation.right.node)

      if (0) {
        console.log('A :', a)
        console.log('B :', b)
        console.log('C :', c)
      }

      // Calculate helper values.
      const minusB = Node.Creator.unaryMinus(b)                // -b
      const twoA   = Node.Creator.operator('*', [NODE_TWO, a]) // 2a

      // TODO: Track steps.
      // Calculate delta.
      const delta = Node.Creator.operator('-', [            // delta =
        Node.Creator.operator('^', [b, NODE_TWO]),          //   b^2
        Node.Creator.operator('*', [NODE_FOUR, a, c], true) // - 4ac
      ])

      // Caculate sqrt(delta)
      const sqrtDelta = Node.Creator.kemuCreateSqrt(delta)

      // Calculate solution: x1
      // Possible improvement: Check delta sign.
      const x1 = Node.Creator.operator('/', [            // x1 =
        Node.Creator.operator('-', [minusB, sqrtDelta]), //  -b - sqrt(delta)
                                                         // -----------------
        twoA                                             //        2a
      ])

      // Calculate solution: x2
      // Possible improvement: Check delta sign.
      const x2 = Node.Creator.operator('/', [            // x1 =
        Node.Creator.operator('+', [minusB, sqrtDelta]), //  -b + sqrt(delta)
                                                         // -----------------
        twoA                                             //        2a
      ])

      // Apply solutions.
      equation.applySolution([x1, x2])
    }
  }
})
