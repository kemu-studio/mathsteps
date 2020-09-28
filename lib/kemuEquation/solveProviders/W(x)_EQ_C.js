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

    // f(x)^a = 0 gives f(x) = 0
    {l: 'EQ(fx^a , 0)' , r: 'EQ(fx , 0)' , id: 'remove_pow_from_left'},

    // General handler for x^n = C
    {l: 'EQ(x^2, a1)', r: '[-sqrt(a1), sqrt(a1)]'           , id: 'solution'},
    {l: 'EQ(x^n, a1)', r: '[-nthRoot(a1,n), nthRoot(a1,n)]' , id: 'solution'},
  ]

  equation.applyRules(poolOfRules, {
    simplifyBeforeEachStepEnabled: true
  })
})
