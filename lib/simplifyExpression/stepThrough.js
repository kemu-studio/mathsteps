const checks      = require('../checks')
const Node        = require('../node')
const ChangeTypes = require('../ChangeTypes')

const simplifyCommon = require('./_common')
const kemuSortArgs   = require('./kemuSortArgs')

const clone = require('../util/clone')
const print = require('../util/print')

const MAX_STEP_COUNT = 64

// Pool of rules to apply.
const POOL_OF_RULES = [
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

// Numerical result e.g. 1.414 instead of sqrt(2).
const POOL_OF_RULES_NUMERICAL = [
  require('./kemuNumericalSearch')
]

function _applyRulesOnChildNode(fct, nodeBox, nodeIdx, options, parentNode) {
  let isChanged = false

  // Apply simplify function on current node.
  let   node   = nodeBox[nodeIdx]
  const status = fct(node, options.expressionCtx, parentNode)

  if (status.hasChanged()) {
    // Current node changed.
    // Report simplify step.
    isChanged        = true
    nodeBox[nodeIdx] = status.newNode
    options.onStepCb(status)

  } else if (node.args) {
    // Nothing changed on current node.
    // Go into child nodes recursively.
    for (let argIdx in node.args) {
      isChanged |= _applyRulesOnChildNode(fct, node.args, argIdx, options, node)
    }
  }

  return isChanged
}

// Given a mathjs expression node, steps through simplifying the expression.
// Returns a list of details about each step.
function stepThrough(node, debug = false, expressionCtx = null) {
  if (debug) {
    // eslint-disable-next-line
    console.log('\n\nSimplifying: ' + print.ascii(node, false, true));
  }

  //
  // Pre-process node.
  //

  node = simplifyCommon.kemuFlatten(node)

  if (checks.hasUnsupportedNodes(node)) {
    return []
  }

  // Now, step through the math expression until nothing changes
  const options = {
    node,
    expressionCtx,

    onStepCb: (nodeStatus) => {
      // console.log("[ STEP ]", nodeStatus.changeType, '|', print.ascii(options.node))

      // if (debug) {
      //  logSteps(nodeStatus)
      // }

      options.node = simplifyCommon.kemuFlatten(options.node)
      options.node = simplifyCommon.kemuNormalizeConstantNodes(options.node)

      const newStep = {
        changeType: nodeStatus.changeType,
        oldNode: oldNode,
        newNode: clone(options.node),
        substeps: nodeStatus.substeps
      }

      oldNode = newStep.node
      steps.push(newStep)
    }
  }

  const steps = []
  let   goOn  = true
  let   iters = 0

  const originalNode = clone(node)
  let   oldNode      = originalNode

  while (goOn) {
    goOn = false

    // Apply common rules first.
    for (let ruleIdx in POOL_OF_RULES) {
      const fct = POOL_OF_RULES[ruleIdx]
      if (_applyRulesOnChildNode(fct, options, 'node', options)) {
        goOn = true
        break
      }
    }

    // Apply numerical rules if needed.
    if (!goOn && expressionCtx && expressionCtx.isNumerical()) {
      for (let ruleIdx in POOL_OF_RULES_NUMERICAL) {
        const fct = POOL_OF_RULES_NUMERICAL[ruleIdx]
        if (_applyRulesOnChildNode(fct, options, 'node', options)) {
          goOn = true
          break
        }
      }
    }

    // Limit iterations to avoid potentially hung-up.
    if (iters++ === MAX_STEP_COUNT) {
      // eslint-disable-next-line
      console.error('Math error: Potential infinite loop for expression: ' +
                    print.ascii(originalNode) + ', returning no steps')
      goOn = false
    }
  }

  //
  // Post-process node.
  //

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
