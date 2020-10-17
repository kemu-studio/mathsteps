const EquationSolver = require('../EquationSolver')
const Equation       = require('../Equation')
const Node           = require('../../node')

const NODE_ZERO = Node.Creator.constant(0)

EquationSolver.registerSolveFunction('f(x)=C', (equation) => {
  // Apply common rules.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx^a, 0)', r: 'EQ(fx, 0)' , id: 'remove_pow'},
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
    }
  }
})
