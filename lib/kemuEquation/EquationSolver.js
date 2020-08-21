class EquationSolver {
  constructor() {
    this.solveFunctionsMap = {}
  }

  registerSolveFunction(pattern, solveFunction) {
    this.solveFunctionsMap[pattern] = solveFunction
  }

  solveEquation(equation) {
    console.log('GOING TO SOLVE:', equation.toString(), '|', equation.getScheme())

    // Build equation pattern.
    // Example: 'x^2 + 2x = -1' gives 'W(x)=C'
    const scheme = equation.getScheme()

    // Search for solve function for given pattern.
    const solveFunction = this.solveFunctionsMap[scheme]

    if (solveFunction == null) {
      throw Error(`no solver for equation: '${pattern}'`)
    }

    // Run solve function.
    solveFunction(equation)
  }
}

// TODO: Review it.
// TODO: Is it really OK to use singleton here?
module.exports = new EquationSolver()

// Register common solve providers.
require('./solveProviders/C_EQ_C')
require('./solveProviders/W(x)_EQ_C')
