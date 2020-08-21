const EquationSolver = require('../EquationSolver')

EquationSolver.registerSolveFunction('W(x)=C', (equation) => {
  // Pool of known transformations.
  const poolOfRules = [
    // Common rules.
    {l: 'EQ(fx + a1 , a2)', r: 'EQ(fx , a2 - a1)' , id: 'move_free_parameter_to_right'},
    {l: 'EQ(fx - a1 , a2)', r: 'EQ(fx , a2 + a1)' , id: 'move_free_parameter_to_right'},

    // Linear equation: W1(x) = C
    {l: 'EQ(a1 x , a2)', r: 'EQ(x , a2 / a1)' , id: 'divide_both_sides'},
    {l: 'EQ(x    , a1)', r: '[a1]'            , id: 'solution'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })
})
