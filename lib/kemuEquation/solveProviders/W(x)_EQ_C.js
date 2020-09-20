const EquationSolver = require('../EquationSolver')

EquationSolver.registerSolveFunction('W(x)=C', (equation) => {
  // Pool of known transformations.
  const poolOfRules = [
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
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })
})
