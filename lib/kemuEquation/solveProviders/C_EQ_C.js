const EquationSolver = require('../EquationSolver')
const Node           = require('../../node')
const stepThrough    = require('../../simplifyExpression/stepThrough')

const NODE_TRUE  = Node.Creator.symbol('true')
const NODE_FALSE = Node.Creator.symbol('false')

EquationSolver.registerSolveFunction('C=C', (equation) => {
  // Simplify both side before step.
  equation.simplifyLeft()
  equation.simplifyRight()

  // Fetch LR nodes.
  const leftNode  = equation.left.node
  const rightNode = equation.right.node

  // Try to calculate L-R difference.
  const steps    = stepThrough(Node.Creator.operator('-', [leftNode, rightNode]))
  const diffNode = steps[steps.length - 1].newNode

  if (Node.Type.isConstant(diffNode)) {
    // L - R gives a constant number.
    // We can check equality directly.

    if (Node.Type.isZero(diffNode)) {
      // L - R = 0
      // Solution is true.
      equation.applySolution(NODE_TRUE)
    } else {
      // L - R != 0
      // Solution is false.
      equation.applySolution(NODE_FALSE)
    }

  } else {
    // L - R is NOT a constant.
    // Give up. We stuck WITHOUT solution.
    // Possible improvement: Handle function nodes e.g. sin(1) = pi
    // Possible improvement: Handle parameter dependend e.g. n=1
  }
})
