const EquationSolver = require('../EquationSolver')
const Equation       = require('../Equation')
const Node           = require('../../node')
const math           = require('mathjs')

const NODE_ZERO = Node.Creator.constant(0)

EquationSolver.registerSolveFunction('f(x)=C', (equation) => {
  // Apply common rules.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx^a    , 0)'  , r: 'EQ(fx  , 0)'        , id: 'remove_pow'},
    {l: 'EQ(fx1/fx2 , a)'  , r: 'EQ(fx1 , a  * fx2)' , id: 'mul_by_fx'},
    {l: 'EQ(a1/fx   , a2)' , r: 'EQ(a1  , a2 * fx)'  , id: 'mul_by_fx'},
    /*
    // Possible improvement: General f(x)^n rules.
    // f(x)^2 = C
    // - equation #1: f(x) = -sqrt(C)
    // - equation #2: f(x) =  sqrt(C)
    {
      l: 'EQ(fx^2, a)',
      r: '[EQ(fx, sqrt(a)), EQ(fx, -sqrt(a))]',
      id: 'remove_pow'
    }
    */
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
      // TODO: Better logs.
      const arrayOfChildEquations = []

      equation.left.node.args.forEach((oneItem) => {
        // Build another fn(x) = 0 equation.
        arrayOfChildEquations.push(
          new Equation(oneItem, NODE_ZERO, '=', equation.unknownVariable))
      })

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
        arrayOfChildEquations.push(
          new Equation(fx, nthRoot, '=', equation.unknownVariable))

      } else {
        // f(x)^2n = C
        // n is divisible by 2.
        // 2n exponent "kills" the sign under the power.
        // There are two possible cases:
        //   1. f(x) = - nthRoot(C, n)
        //   2. f(x) =   nthRoot(C, n)
        arrayOfChildEquations.push(
          new Equation(fx, Node.Creator.unaryMinus(nthRoot), '=', equation.unknownVariable))

        arrayOfChildEquations.push(
          new Equation(fx, nthRoot, '=', equation.unknownVariable))
      }

      EquationSolver.forkEquation(equation, arrayOfChildEquations)
    }
  }
})
