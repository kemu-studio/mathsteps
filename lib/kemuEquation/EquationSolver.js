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
    // TODO: Better way to detect did any changes applied.
    // TODO: Optimize it.
    let attempIdx          = 1
    let equationHashBefore = equation.toString()
    let equationHashAfter  = null

    // TODO: Better logs.
    const _solve = () => {
      let iterIdx  = 0
      let haveHope = true

      while (!equation.isSolved() && haveHope && (iterIdx < MAX_ITERATIONS)) {
        this._solveInternal(equation)

        equationHashAfter = equation.toString()

        if (equationHashBefore == equationHashAfter) {
          // Nothing changed after equation step.
          // We stuck without hope to solve it in next steps.
          haveHope = false
        }

        // Go to next iteration if needed.
        equationHashBefore = equationHashAfter
        iterIdx++
      }
    }

    // 1. First try.
    _solve();

    if (!equation.isSolved()) {
      // 2. Second try. Simplify left side and try one more time.
      // We don't apply simplify at the begining to avoid alling into
      // too complicated patterns, which we can't match easily e.g. after
      // multiplication (x-2)(x+2).
      equation.simplifyLeft();
      _solve();

      if (!equation.isSolved()) {
        // 3. Third try. Simplify right and try one more time.
        equation.simplifyRight();
        _solve();
      }
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
