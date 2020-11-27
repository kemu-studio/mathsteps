const checks = require('../checks')
const Node = require('../node')
const Status = require('../node/Status')
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

  let nodeStatus
  const steps = []

  const originalExpressionStr = print.ascii(node)
  const MAX_STEP_COUNT = 64
  let   iters = 0

  // Now, step through the math expression until nothing changes
  nodeStatus = step(node, expressionCtx)

  while (nodeStatus.hasChanged()) {
    if (debug) {
      logSteps(nodeStatus)
    }

    steps.push(nodeStatus)

    node = Status.resetChangeGroups(nodeStatus.newNode)
    node = simplifyCommon.kemuFlatten(node)
    node = simplifyCommon.kemuNormalizeConstantNodes(node)

    nodeStatus = step(node, expressionCtx)

    if (iters++ === MAX_STEP_COUNT) {
      // eslint-disable-next-line
      console.error('Math error: Potential infinite loop for expression: ' +
                    originalExpressionStr + ', returning no steps')
      return []
    }
  }

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

function applyRules(fct, node, expressionCtx, parentNode) {
  let rv = null

  // Process child nodes first.
  let status = fct(node, expressionCtx, parentNode)

  if (status.hasChanged()) {
    rv = status

  } else if (node.args) {
    for (let i = 0; i < node.args.length; i++) {
      const childNodeStatus = applyRules(fct, node.args[i], expressionCtx, node)
      if (childNodeStatus.hasChanged()) {
        rv = Node.Status.childChanged(node, childNodeStatus, i)
        break
      }
    }
  }

  if (!rv) {
    rv = Node.Status.noChange(node)
  }

  return rv
}

// Given a mathjs expression node, performs a single step to simplify the
// expression. Returns a Node.Status object.
function step(node, expressionCtx, isDeadEnd) {
  let nodeStatus = Node.Status.noChange(node)

  const simplificationTreeSearches = [
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
    simplificationTreeSearches.push(kemuNumericalSearch)
  }

  for (let i = 0; i < simplificationTreeSearches.length; i++) {
    nodeStatus = applyRules(simplificationTreeSearches[i], node, expressionCtx)

    // Always update node, since there might be changes that didn't
    // count as a step.
    node = nodeStatus.newNode

    if (nodeStatus.hasChanged()) {
      break
    }
  }

  if (!nodeStatus.hasChanged() && !isDeadEnd && !node._kemuIsSorted) {
    // There were no any changes applied.
    // Maybe we can do something more after args reorder.
    // We delay sort to the dead-end step for performance reasons.
    kemuSortArgs(node)
    nodeStatus = step(node, expressionCtx, true)
  }

  return nodeStatus
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
