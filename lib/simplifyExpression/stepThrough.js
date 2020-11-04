const math = require('mathjs')
const checks = require('../checks')
const Node = require('../node')
const Status = require('../node/Status')
const ChangeTypes = require('../ChangeTypes')

const simplifyCommon      = require('./_common')
const kemuSortArgs        = require('./kemuSortArgs')
const kemuNumericalSearch = require('./kemuNumericalSearch')

const clone = require('../util/clone')
const flattenOperands = require('../util/flattenOperands')
const print = require('../util/print')
const removeUnnecessaryParens = require('../util/removeUnnecessaryParens')

// Given a mathjs expression node, steps through simplifying the expression.
// Returns a list of details about each step.
function stepThrough(node, debug = false, expressionCtx = null) {
  if (debug) {
    // eslint-disable-next-line
    console.log('\n\nSimplifying: ' + print.ascii(node, false, true));
  }

  if (checks.hasUnsupportedNodes(node)) {
    return []
  }

  // Make sure we store all constant nodes as bignumber to avoid fake unequals.
  node = simplifyCommon.kemuNormalizeConstantNodes(node)

  let nodeStatus
  const steps = []

  const originalExpressionStr = print.ascii(node)
  const MAX_STEP_COUNT = 64
  let iters = 0

  // Now, step through the math expression until nothing changes
  nodeStatus = step(node, expressionCtx)
  while (nodeStatus.hasChanged()) {
    if (debug) {
      logSteps(nodeStatus)
    }

    steps.push(removeUnnecessaryParensInStep(nodeStatus))

    node = Status.resetChangeGroups(nodeStatus.newNode)
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

  const resultNodeFlat = removeUnnecessaryParens(clone(resultNode), true)

  if (!resultNodeFlat.equals(resultNode)) {
    // Report remove parenthesis step - we want show it in steps list.
    steps.push({
      // TODO: Review it.
      changeType: ChangeTypes.REARRANGE_COEFF, // KEMU_REMOVE_UNNEDED_PARENTHESIS,
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

// Given a mathjs expression node, performs a single step to simplify the
// expression. Returns a Node.Status object.
function step(node, expressionCtx, isDeadEnd) {
  let nodeStatus

  node = flattenOperands(node)
  node = removeUnnecessaryParens(node, true)

  const simplificationTreeSearches = [
    // Basic simplifications that we always try first e.g. (...)^0 => 1
    require('./basicsSearch'),

    // OBSOLETE: Moved to rules table.
    // Simplify any division chains so there's at most one division operation.
    // e.g. 2/x/6 -> 2/(x*6)
    // e.g. 2/(x/6) => 2 * 6/x
    // divisionSearch,

    // Adding fractions, cancelling out things in fractions
    require('./fractionsSearch'),

    // e.g. addition of polynomial terms: 2x + 4x^2 + x => 4x^2 + 3x
    // e.g. multiplication of polynomial terms: 2x * x * x^2 => 2x^3
    // e.g. multiplication of constants: 10^3 * 10^2 => 10^5
    require('./collectAndCombineSearch'),

    // e.g. 2 + 2 => 4
    require('./arithmeticSearch'),

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
    nodeStatus = simplificationTreeSearches[i](node, expressionCtx)
    // Always update node, since there might be changes that didn't count as
    // a step. Remove unnecessary parens, in case one a step results in more
    // parens than needed.
    node = removeUnnecessaryParens(nodeStatus.newNode, true)
    if (nodeStatus.hasChanged()) {
      node = flattenOperands(node)
      nodeStatus.newNode = clone(node)
      return nodeStatus
    } else {
      node = flattenOperands(node)
    }
  }

  if (!isDeadEnd && !node._kemuIsSorted) {
    // There were no any changes applied.
    // Maybe we can do something more after args reorder.
    // We delay sort to the dead-end step for performance reasons.
    kemuSortArgs(node)
    return step(node, expressionCtx, true)
  }

  return Node.Status.noChange(node)
}

// Removes unnecessary parens throughout the steps.
// TODO: Ideally this would happen in NodeStatus instead.
function removeUnnecessaryParensInStep(nodeStatus) {
  if (nodeStatus.substeps.length > 0) {
    nodeStatus.substeps.map(removeUnnecessaryParensInStep)
  }

  nodeStatus.oldNode = removeUnnecessaryParens(nodeStatus.oldNode, true)
  nodeStatus.newNode = removeUnnecessaryParens(nodeStatus.newNode, true)
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
