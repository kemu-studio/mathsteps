const MAX_ITERATIONS = 20

class EquationSolver {
  constructor() {
    this.solveFunctionsMap = {}
  }

  registerSolveFunction(pattern, solveFunction) {
    this.solveFunctionsMap[pattern] = solveFunction
  }

  _applyCommonRules(equation) {
    // Transformations common to each equation types.
    // These rules are applied BEFORE rules delivered by solve providers.
    const poolOfRules = [
      {l: 'EQ(a, fx)' , r: 'EQ(fx, a)' , id: 'swap_sides'},
    ]
    equation.applyRules(poolOfRules)
  }

  _solveInternal(equation) {
    equation._logStep()
    equation._logStep('going to solve...')

    // Apply most generic rules before any other steps delivered by
    // solve providers.
    this._applyCommonRules(equation)

    // Build equation pattern.
    // Example: 'x^2 + 2x = -1' gives 'W(x)=C'
    const scheme = equation.getScheme()

    // Search for solve function for given pattern.
    const solveFunction = this.solveFunctionsMap[scheme]

    if (solveFunction == null) {
      throw Error(`no solver for equation: '${scheme}'`)
    }

    // Run solve function.
    solveFunction(equation)
  }

  solveEquation(equation) {
    // TODO: Better logs.
    // TODO: Break if no any steps applied.
    let iterIdx = 0

    while (!equation.isSolved() && (iterIdx < MAX_ITERATIONS)) {
      this._solveInternal(equation)

      // Go to next iteration if needed.
      iterIdx++
    }
  }
}

// TODO: Review it.
// TODO: Is it really OK to use singleton here?
module.exports = new EquationSolver()

// Register common solve providers.
require('./solveProviders/C_EQ_C')
require('./solveProviders/W(x)_EQ_C')
require('./solveProviders/W(x)_EQ_W(x)')
require('./solveProviders/f(x)_EQ_C')
