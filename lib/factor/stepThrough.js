const checks = require('../checks')

const factorCommon    = require('./factorCommon')
const factorQuadratic = require('./factorQuadratic')
const simplifyCommon = require('../simplifyExpression/_common')

// Given a mathjs expression node, steps through factoring the expression.
// Currently only supports factoring quadratics.
// Returns a list of details about each step.
function stepThrough(node, debug = false) {
  if (debug) {
    // eslint-disable-next-line
    console.log('\n\nFactoring: ' + print.ascii(node, false, true));
  }

  if (checks.hasUnsupportedNodes(node)) {
    return []
  }

  let nodeStatus
  const steps = []

  nodeStatus = factorCommon(node)
  if (nodeStatus.hasChanged()) {
    steps.push(nodeStatus)

  } else {
    node = simplifyCommon.kemuFlatten(node)
    if (checks.isQuadratic(node)) {
      nodeStatus = factorQuadratic(node)
      if (nodeStatus.hasChanged()) {
        steps.push(nodeStatus)
      }
    }
  }

  // Add factoring higher order polynomials...

  return steps
}

module.exports = stepThrough
