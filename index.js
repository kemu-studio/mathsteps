const {math} = require('./config')
const ChangeTypes = require('./lib/ChangeTypes')
const Node = require('./lib/node')
const stepThrough = require('./lib/simplifyExpression/stepThrough')
const print = require('./lib/util/print').ascii
const printLatex = require('./lib/util/print').latex
const simplifyCommon = require('./lib/simplifyExpression/_common')
const clone = require('./lib/util/clone')

const CACHE_ENABLED             = true
const CACHE_LOG_MISSING_ENABLED = false
const CACHE_LOG_REUSED_ENABLED  = false

const CACHE_COMPARE      = {}
const CACHE_TEXT_TO_TEX  = {}
const CACHE_TEXT_TO_NODE = {}

function _compareByTextInternal(x, y) {
  try {
    return math.compare(x, y)
  } catch(err) {
    return NaN
  }
}

function _postProcessResultTeX(resultTeX) {
  // Don't use x := y definitions.
  // We want x = y everywhere.
  return resultTeX.replace(':=', '=')
}

function printAsTeX(node) {
  return _postProcessResultTeX(printLatex(node))
}

function compareByText(x, y) {
  let rv = NaN

  if (CACHE_ENABLED) {
    const cacheKey = x + '|' + y
    rv = CACHE_COMPARE[cacheKey]

    if (rv == null) {
      // Cache missing.
      if (CACHE_LOG_MISSING_ENABLED) {
        console.log('[ KMATHSTEPS ] Cache missing (compare)', x, y)
      }

      rv = _compareByTextInternal(x, y)
      CACHE_COMPARE[cacheKey] = rv

    } else {
      // Already cached - reuse previous result.
      if (CACHE_LOG_REUSED_ENABLED) {
        console.log('[ KMATHSTEPS ] Cache reused (compare)', x, y)
      }
    }

  } else {
    // Cache disabled - just wrap original call.
    rv = _compareByTextInternal(x, y)
  }

  return rv
}

function convertTextToTeX(text) {
  let rv = text

  if (text && (text.trim() !== '')) {
    if (CACHE_ENABLED) {
      text = text.trim()
      rv   = CACHE_TEXT_TO_TEX[text]

      if (rv == null) {
        // Cache missing.
        if (CACHE_LOG_MISSING_ENABLED) {
          console.log('[ KMATHSTEPS ] Cache missing (text to TeX)', text)
        }

        rv = printAsTeX(parseText(text))
        CACHE_TEXT_TO_TEX[text] = rv

      } else {
        // Already cached - reuse previous result.
        if (CACHE_LOG_REUSED_ENABLED) {
          console.log('[ KMATHSTEPS ] Cache reused (text to TeX)', text)
        }
      }
    } else {
      // Cache disabled - just wrap original call.
      rv = printAsTeX(math.parse(text))
    }
  }

  return rv
}

function _parseTextInternal(text) {
  let rv = math.parse(text)

  // Make sure we store all constant nodes as bignumber to avoid fake unequals.
  rv = simplifyCommon.kemuNormalizeConstantNodes(rv)

  return rv
}

function parseText(text) {
  let rv = null

  if (CACHE_ENABLED) {
    text = text.trim()
    rv   = CACHE_TEXT_TO_NODE[text]

    if (rv == null) {
      // Cache missing.
      if (CACHE_LOG_MISSING_ENABLED) {
        console.log('[ KMATHSTEPS ] Cache missing (text to node)', text)
      }

      rv = _parseTextInternal(text)
      CACHE_TEXT_TO_NODE[text] = rv

    } else {
      // Already cached - reuse previous result.
      if (CACHE_LOG_REUSED_ENABLED) {
        console.log('[ KMATHSTEPS ] Cache reused (text to node)', text)
      }
    }

    // Avoid modifying nodes stored inside cache.
    rv = clone(rv)

  } else {
    // Cache disabled - just wrap original call.
    rv = _parseTextInternal(text)
  }

  return rv
}

function simplifyExpression(options) {
  let rv = null

  try {
    // Fetch input expression.
    let expressionNode = null

    if (options.expressionAsText != null) {
      expressionNode = parseText(options.expressionAsText)

    } else if (options.expressionNode != null) {
      expressionNode = options.expressionNode

    } else {
      throw 'missing expression'
    }

    // Simplify expression.
    rv = stepThrough.newApi(expressionNode, options)

  } catch (err) {
    console.log(err)
  }

  return rv
}

function isOkAsSymbolicExpression(expressionAsText) {
  let rv = false

  if (expressionAsText && (expressionAsText.search(/-\s*-/) === -1)) {
    try {
      const expressionNode = parseText(expressionAsText + '*1')
      const steps = stepThrough.oldApi(expressionNode)
      rv = (steps.length > 0)
    } catch (e) {
      // Hide exceptions.
    }
  }

  return rv
}

function kemuSolveEquation(options) {
  const Equation       = require('./lib/kemuEquation/Equation')
  const EquationSolver = require('./lib/kemuEquation/EquationSolver')

  const equation = new Equation(options)
  EquationSolver.solveEquation(equation)

  return equation
}

function solveEquation(x) {
  if (typeof (x) !== 'object') {
    throw 'error: options object expected'
  }
  return kemuSolveEquation(x)
}

function normalizeExpression(text) {
  let rv = '[?]'

  try {
    rv = print(parseText(text))
  } catch (err) {
    rv = '[error]'
  }

  return rv
}

module.exports = {
  simplifyExpression,
  solveEquation,
  kemuSolveEquation,
  ChangeTypes,
  normalizeExpression,
  print,
  printAsTeX,
  compareByText,
  math,
  convertTextToTeX,
  parseText,
  isOkAsSymbolicExpression,
  Node
}
