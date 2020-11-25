const {math}         = require('../../../config')
const Node           = require('../../node')
const EquationSolver = require('../EquationSolver')

const NODE_ZERO = Node.Creator.constant(0)

EquationSolver.registerSolveFunction('f(x)=C', (equation) => {
  // TODO: Why Equation is set to {} at first require time?
  const Equation = require('../Equation')

  // Apply common rules.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx^a   , 0)'  , r: 'EQ(fx  , 0)'        , id: 'remove_pow'},
    {l: 'EQ(fx1/fx , a2)' , r: 'EQ(fx1 , a2 * fx)'  , id: 'mul_by_fx'},
    {l: 'EQ(a1/fx  , a2)' , r: 'EQ(a1  , a2 * fx)'  , id: 'mul_by_fx'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: false
  })

  if (!equation.isSolved()) {
    // Possible improvement: General fork mechanism in EquationSolver?
    if (Node.Type.isOperator(equation.left.node, '*') &&
        Node.Type.isZero(equation.right.node)) {

      // Fork f1(x) * f2(x) * ... = 0 into separated equations:
      // f1(x) = 0
      // f2(x) = 0
      // ...
      const arrayOfChildEquations = []

      // Helper function to collect nested x*(y*z) factors.
      // We want x*(y*z) = 0 gives three equations:
      // x = 0
      // y = 0
      // z = 0
      // Possible improvement: move to core code?
      const _collectFactors = (node, cb) => {
        if (Node.Type.isOperator(node, '*')) {
          // x * y ... - collect all factors from x and y recursively.
          node.args.forEach((oneChild) => {
            _collectFactors(oneChild, cb)
          })

        } else {
          // Not a multiply node.
          // Collect factor as is.
          cb(node)
        }
      }

      // Collect child equations.
      _collectFactors(equation.left.node, (node) => {
        // Build another fn(x) = 0 equation.
        // We want one equation per factor.
        arrayOfChildEquations.push(
          new Equation({
            leftNode: node,
            rightNode: NODE_ZERO,
            comparator: '=',
            unknownVariable: equation.unknownVariable
          })
        )
      })

      // Fork parent equation into many children equations.
      EquationSolver.forkEquation(equation, arrayOfChildEquations)

    } else if (Node.Type.isOperator(equation.left.node, '^') &&
               Node.Type.isConstant(equation.left.node.args[1]) &&
               !Node.Type.doesContainSymbol(equation.left.node.args[1]) &&
               !Node.Type.doesContainSymbol(equation.right.node, equation.unknownVariable)) {
      // f(x)^n = C
      // Possible improvement: General substitution mechanism:
      // Possible improvement: Example: (x+2)^4 = 1 <=> t^4 = 1
      // Possible improvement: Move to rules table?
      const fx = equation.left.node.args[0]
      const n  = equation.left.node.args[1]
      const C  = equation.right.node

      const nthRoot = Node.Creator.nthRoot(C, n)

      const arrayOfChildEquations = []

      if (math.unequal(math.mod(n.value, 2), 0)) {
        // n is *NOT* divisible by 2.
        // Perform nth-root on both sides.
        // f(x)^n = C <=> f(x) = nthRoot(C, n)
        arrayOfChildEquations.push(new Equation({
          leftNode: fx,
          rightNode: nthRoot,
          comparator: '=',
          unknownVariable: equation.unknownVariable
        }))

      } else {
        // f(x)^2n = C
        // n is divisible by 2.
        // 2n exponent "kills" the sign under the power.
        // There are two possible cases:
        //   1. f(x) = - nthRoot(C, n)
        //   2. f(x) =   nthRoot(C, n)
        arrayOfChildEquations.push(new Equation({
          leftNode: fx,
          rightNode: Node.Creator.unaryMinus(nthRoot),
          comparator: '=',
          unknownVariable: equation.unknownVariable
        }))

        arrayOfChildEquations.push(new Equation({
          leftNode: fx,
          rightNode: nthRoot,
          comparator: '=',
          unknownVariable: equation.unknownVariable
        }))
      }

      EquationSolver.forkEquation(equation, arrayOfChildEquations)
    }
  }
})
