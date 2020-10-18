const EquationSolver = require('../EquationSolver')

EquationSolver.registerSolveFunction('f(x)=W(x)', (equation) => {
  // Apply common rules.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx1 , fx2)'  , r: 'EQ(fx1 - fx2, 0)' , id: 'mov_x_to_left'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: false
  })
})
