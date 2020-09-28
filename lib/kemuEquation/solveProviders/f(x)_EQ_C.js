const EquationSolver = require('../EquationSolver')
const Equation       = require('../Equation')
const Node           = require('../../node')

const NODE_ZERO = Node.Creator.constant(0)

EquationSolver.registerSolveFunction('f(x)=C', (equation) => {
  // TODO:
  const poolOfRules = [
    // Common rules.
  ]

  if (Node.Type.isOperator(equation.left.node, '*') &&
      Node.Type.isZero(equation.right.node)) {

    // Fork f1(x) * f2(x) * ... = 0 into separated equations:
    // f1(x) = 0
    // f2(x) = 0
    // ...
    // TODO: Better logs.

    let   arrayOfSolutions = []
    const unknownVariable  = equation.unknownVariable

    equation.left.node.args.forEach((oneItem) => {
      // Build another fn(x) = 0 equation.
      const childEquation = new Equation(oneItem, NODE_ZERO, '=', unknownVariable)

      // Solve child equation.
      EquationSolver.solveEquation(childEquation)

      // Join solutions from child nodes.
      if (childEquation.isSolved()) {
        // Success, child equation is solved.
        // Collect another solution for the parent equation.
        arrayOfSolutions = arrayOfSolutions.concat(childEquation.getSolutions())

      } else {
        // TODO: What to do if some child equations are solved, but
        // another are not?
      }
    })

    // Apply solutions collected from forked equations if found.
    if (arrayOfSolutions.length > 0) {
      equation.applySolution(arrayOfSolutions)
    }
  }
})
