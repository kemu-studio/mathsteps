const Node = require('../../node')
const TreeSearch = require('../../TreeSearch')

const reduce                   = require('./reduce')
const multiplyShortFormulas    = require('./multiplyShortFormulas')
const sqrtFromPow              = require('./sqrtFromPow')
const sqrtFromConstant         = require('./sqrtFromConstant')
const powFactors               = require('./powFactors')
const removeUnnededParenthesis = require('./removeUnnededParenthesis')
const powToNegativeExponent    = require('./powToNegativeExponent')
const commonFunctions          = require('./commonFunctions')
const simplifyDoubleUnaryMinus = require('./simplifyDoubleUnaryMinus')
const powOfPow                 = require('./obsolete/powOfPow')

const SIMPLIFICATION_FUNCTIONS = [
  // common function simplification e.g. sin(0) gives 0
  commonFunctions,

  // x^-1 gives 1/x
  powToNegativeExponent,

  // sqrt(x)*sqrt(x) gives x (OBSOLETE: Moved to rules table)?
  // sqrtMultiplication,

  // sqrt(1) gives 1 (OBSOLETE: Moved to rules table)
  // sqrtFromOne,

  // sqrt(x^2) gives x or |x| (depends on domain)
  sqrtFromPow,

  // sqrt(n) - calculate if possible.
  sqrtFromConstant,

  // (a*b*c*...)^n gives a^n + b^n + c^n + ...^n
  powFactors,

  // (a/b)^x gives a^x/b^x (OBSOLETE: Moved to rules table)
  // powFraction,

  // (x*y*z)*(a*b*c) gives x*y*z*a*b*c
  // x*(a*b*c) gives x*a*b*c
  // (a*b*c)*x gives a*b*c*x
  // a*(b/c) gives a*b/c
  // (a/b)*c gives a/b*c
  removeUnnededParenthesis,

  // Possible improvement: Move to rules table.
  // (x^a)^b gives x^(a*b)
  powOfPow,

  // sqrt(x)^2 gives x (OBSOLETE: Moved to rules table)
  // sqrt(x)^b gives x^(b/2)
  // powOfSqrt,

  // a * 1/x gives a/x (OBSOLETE: Moved to rules table)
  // removeFractionWithUnitNumerator,

  // (x/y)/z gives x/(y*z) (OBSOLETE: Moved to rules table)
  // removeDoubleFraction,

  // - (a -b c) gives (a b c) (TODO: Is it still needed?)
  // simplifyDoubleUnaryMinus,

  // x y + x y gives 2 x y (OBSOLETE: Moved to rules table)
  // Possible improvement: integrate with original mathsteps code
  // addLikeTerms,

  // x*a/x gives a (TODO: Is it still needed?)
  // reduce,

  // (a + b)^2 gives a^2 + 2ab + b^2 etc.
  multiplyShortFormulas,
]

const search = TreeSearch.preOrder(basics)

// Look for kemu step(s) to perform on a node. Returns a Node.Status object.
function basics(node, expressionCtx) {
  for (let i = 0; i < SIMPLIFICATION_FUNCTIONS.length; i++) {
    const nodeStatus = SIMPLIFICATION_FUNCTIONS[i](node, expressionCtx)
    if (nodeStatus.hasChanged()) {
      return nodeStatus
    } else {
      node = nodeStatus.newNode
    }
  }
  return Node.Status.noChange(node)
}

module.exports = search
