const EquationSolver = require('../EquationSolver')

EquationSolver.registerSolveFunction('W(x)=W(x)', (equation) => {
  // We want to transform:
  // Before : W(x)=W(x)
  // After  : W(x)=C
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx1 , fx + a1)' , r: 'EQ(fx1 - fx,  a1)' , id: 'move_fx_to_left'},
    {l: 'EQ(fx1 , fx - a1)' , r: 'EQ(fx1 - fx, -a1)' , id: 'move_fx_to_left'},
    {l: 'EQ(fx1 , fx     )' , r: 'EQ(fx1 - fx,   0)' , id: 'move_fx_to_left'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })
})
