const checks = require('../checks')
const Node = require('../node')
const ChangeTypes = require('../ChangeTypes')

const simplifyCommon      = require('./_common')
const kemuSortArgs        = require('./kemuSortArgs')
const kemuNumericalSearch = require('./kemuNumericalSearch')

const clone = require('../util/clone')
const print = require('../util/print')

// Given a mathjs expression node, steps through simplifying the expression.
// Returns a list of details about each step.
function stepThrough(node, debug = false, expressionCtx = null) {
  if (debug) {
    // eslint-disable-next-line
    console.log('\n\nSimplifying: ' + print.ascii(node, false, true));
  }

  node = simplifyCommon.kemuFlatten(node)

  if (checks.hasUnsupportedNodes(node)) {
    return []
  }

  const steps = []

  const MAX_STEP_COUNT = 64
  let   iters = 0

  // Pool of rules to apply.
  const poolOfRules = [
    // Basic simplifications that we always try first e.g. (...)^0 => 1
    require('./basicsSearch'),

    // Adding fractions, cancelling out things in fractions
    require('./fractionsSearch'),

    // e.g. addition of polynomial terms: 2x + 4x^2 + x => 4x^2 + 3x
    // e.g. multiplication of polynomial terms: 2x * x * x^2 => 2x^3
    // e.g. multiplication of constants: 10^3 * 10^2 => 10^5
    require('./collectAndCombineSearch'),

    // e.g. (2 + x) / 4 => 2/4 + x/4
    require('./breakUpNumeratorSearch'),

    // e.g. 3/x * 2x/5 => (3 * 2x) / (x * 5)
    require('./multiplyFractionsSearch'),

    // e.g. (2x + 3)(x + 4) => 2x^2 + 11x + 12
    require('./distributeSearch'),

    // KEMU extensions
    require('./kemuCommonSearch'),

    // e.g. abs(-4) => 4
    require('./functionsSearch'),
  ]

  // We want numerical result e.g. 1.414 instead of sqrt(2).
  if (expressionCtx && expressionCtx.isNumerical()) {
    poolOfRules.push(kemuNumericalSearch)
  }

  let oldNode = clone(node)

  // Now, step through the math expression until nothing changes
  const options = {
    poolOfRules,
    node,
    expressionCtx,

    onStepCb: (nodeStatus) => {
      // console.log("[ STEP ]", nodeStatus.changeType, '|', print.ascii(options.node))

      // if (debug) {
      //  logSteps(nodeStatus)
      // }

      options.node = simplifyCommon.kemuFlatten(options.node)
      options.node = simplifyCommon.kemuNormalizeConstantNodes(options.node)

      steps.push({
        changeType: nodeStatus.changeType,
        oldNode: oldNode,
        newNode: clone(options.node),
        substeps: nodeStatus.substeps
      })

      oldNode = clone(options.node)
    }
  }

  step(options)

  /*
    if (iters++ === MAX_STEP_COUNT) {
      // eslint-disable-next-line
      console.error('Math error: Potential infinite loop for expression: ' +
                    originalExpressionStr + ', returning no steps')
      return []
    }
  }
  */

  // Remove unneded parethesis along whole expression.
  // We don't do it at the begin to avoid breaking original mathsteps tests.
  const resultNode = (steps.length > 0)
    ? steps[steps.length - 1].newNode
    : node

  const resultNodeFlat = clone(resultNode)

  if (!resultNodeFlat.equals(resultNode)) {
    // Report remove parenthesis step - we want show it in steps list.
    steps.push({
      changeType: ChangeTypes.REARRANGE_COEFF,
      oldNode: clone(resultNode),
      newNode: resultNodeFlat,
      substeps: []
    })
  }

  // Sort arguments in the final result step.
  if (steps.length > 0) {
    kemuSortArgs(steps[steps.length - 1].newNode)

  } else {
    // Possible improvement: Optimize it.
    const newNode = clone(node)
    kemuSortArgs(newNode)

    const oldNodeAsText = print.ascii(node)
    const newNodeAsText = print.ascii(newNode)

    if (oldNodeAsText !== newNodeAsText) {
      steps.push(
        Node.Status.nodeChanged(
          ChangeTypes.REARRANGE_COEFF, node, newNode))
    }
  }

  return steps
}

function applyRules(fct, nodeBox, nodeIdx, options, parentNode) {
  let   rv     = false
  let   node   = nodeBox[nodeIdx]

  const status = fct(node, options.expressionCtx, parentNode)

  if (status.hasChanged()) {
    rv               = true
    nodeBox[nodeIdx] = status.newNode
    options.onStepCb(status)

  } else if (node.args) {
    for (let i = 0; i < node.args.length; i++) {
      if (applyRules(fct, node.args, i, options, node)) {
        rv = true
        break
      }
    }
  }

  return rv
}

// Given a mathjs expression node, performs a single step to simplify the
// expression. Returns a Node.Status object.
function step(options) {
  let goOn = true

  while (goOn) {
    goOn = false

    for (let i = 0; i < options.poolOfRules.length; i++) {
      const nodeStatus = applyRules(options.poolOfRules[i], options, 'node', options)

      if (nodeStatus) {
        goOn = true
        break
      }
    }
  }
}

function logSteps(nodeStatus) {
  // eslint-disable-next-line
  console.log(nodeStatus.changeType);
  // eslint-disable-next-line
  console.log(print.ascii(nodeStatus.newNode) + '\n');

  if (nodeStatus.substeps.length > 0) {
    // eslint-disable-next-line
    console.log('\nsubsteps: ');
    nodeStatus.substeps.forEach(substep => substep)
  }
}

module.exports = stepThrough
