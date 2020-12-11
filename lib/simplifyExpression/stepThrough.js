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
  // Convert 3.14 to 314/100 etc. in non-numerical mode.
  require('./rules/convertDecimalToFraction'),

  // Basic simplifications that we always try first e.g. (...)^0 => 1
  require('./rules/commonRules'),

  // 3x + 2x gives 5x etc.
  require('./rules/collectLikeTerms'),

  // x*a/x gives a
  require('./rules/reduce'),

  // common function simplification e.g. sin(0) gives 0
  require('./rules/commonFunctions'),

  // (a + b + c + ...) * x gives ac ax + bx + cx + ... etc.
  require('./rules/distribute'),

  // sqrt(x^2) gives x or |x| (depends on domain)
  require('./rules/sqrtFromPow'),

  // sqrt(n) - calculate if possible.
  require('./rules/sqrtFromConstant'),

  // (a + b)^2 gives a^2 + 2ab + b^2 etc.
  require('./rules/multiplyShortFormulas'),

  // Numerical result e.g. 1.414 instead of sqrt(2).
  require('./rules/calculateNumericalValue')
]

function _applyRulesOnChildNode(fct, nodeBox, nodeIdx, ctx, nodeParent) {
  let isChanged = false

  if (ctx.iterIdx < MAX_STEP_COUNT) {
    // Apply simplify function on current node.
    let   node   = nodeBox[nodeIdx]
    const status = fct(node, ctx.expressionCtx, nodeParent)

    if (status) {
      // Current node changed.
      // Report simplify step.
      isChanged        = true
      nodeBox[nodeIdx] = status.newNode

      // Track last changed node.
      // We'll start next simplify step from this node.
      ctx.lastChangedNodeBox    = nodeBox
      ctx.lastChangedNodeIdx    = nodeIdx
      ctx.lastChangedNodeParent = nodeParent
      ctx.onStepCb(status)

    } else if (node.args) {
      // Nothing changed on current node.
      // Go into child nodes recursively.
      for (let argIdx in node.args) {
        isChanged |= _applyRulesOnChildNode(fct, node.args, argIdx, ctx, node)
      }
    }
  }

  return isChanged
}

// Given a mathjs expression node, steps through simplifying the expression.
// Returns a list of details about each step.
function stepThrough(node, options={}) {
  const steps = []

  if (options.isDebugMode) {
    // eslint-disable-next-line
    console.log('\n\nSimplifying: ' + print.ascii(node));
  }

  //
  // Pre-process node.
  //

  node = simplifyCommon.kemuFlatten(node)

  if (!checks.hasUnsupportedNodes(node)) {
    //
    // Set-up simplify context passed along all steps.
    //

    const simplifyCtx = {
      iterIdx: 0,
      rootNode: node,
      expressionCtx: options.expressionCtx,

      // Callback called when any part of expression (node) changed.
      // We use it to track/collect steps.
      onStepCb: (nodeStatus) => {
        if (options.isDebugMode) {
          logSteps(nodeStatus)
        }

        simplifyCtx.rootNode = simplifyCommon.kemuFlatten(simplifyCtx.rootNode)
        simplifyCtx.rootNode = simplifyCommon.kemuNormalizeConstantNodes(simplifyCtx.rootNode)
        simplifyCtx.iterIdx++

        const newStep = {
          changeType: nodeStatus.changeType,
          oldNode: oldNode,
          newNode: clone(simplifyCtx.rootNode),
          substeps: nodeStatus.substeps
        }

        oldNode = newStep.newNode
        steps.push(newStep)

        if (options.onStepCb) {
          options.onStepCb(newStep)
        }
      }
    }

    //
    // Apply simplify rules to the expression.
    //

    const originalNode = clone(node)
    let   oldNode      = originalNode
    let   goOn         = true

    let isShuffled = false
    let expressionAsTextAfterShuffle = null

    // Step through the math expression until nothing changes.
    while (goOn) {
      goOn = false

      // Process last changed node or root.
      const nodeBox    = simplifyCtx.lastChangedNodeBox || simplifyCtx
      const nodeIdx    = simplifyCtx.lastChangedNodeIdx || 'rootNode'
      const nodeParent = simplifyCtx.lastChangedNodeParent

      // Apply common rules first.
      for (let ruleIdx in POOL_OF_RULES) {
        const fct = POOL_OF_RULES[ruleIdx]
        if (_applyRulesOnChildNode(fct, nodeBox, nodeIdx, simplifyCtx, nodeParent)) {
          goOn       = true
          isShuffled = false
          break
        }
      }

      // Back to root if child node went to dead-end.
      if (!goOn && simplifyCtx.lastChangedNodeBox) {
        // Reset current node to the root.
        goOn = true
        simplifyCtx.lastChangedNodeBox    = null
        simplifyCtx.lastChangedNodeIdx    = null
        simplifyCtx.lastChangedNodeParent = null
      }

      // Try refactor whole expression from scratch if still dead-end.
      if (!goOn && !isShuffled) {
        // Rebuild expression from the scratch.
        const mathsteps  = require('../../index.js')
        const exprAsText = print.ascii(simplifyCtx.rootNode)

        if (expressionAsTextAfterShuffle !== exprAsText) {
          // Try shuffle only once after each dead-end.
          isShuffled = true
          goOn       = true

          // Reset current node to the root.
          simplifyCtx.lastChangedNodeBox    = null
          simplifyCtx.lastChangedNodeIdx    = null
          simplifyCtx.lastChangedNodeParent = null
          simplifyCtx.rootNode              = mathsteps.parseText(exprAsText)

          expressionAsTextAfterShuffle = exprAsText
        }
      }

      // Limit iterations to avoid potentially hung-up.
      if (simplifyCtx.iterIdx === MAX_STEP_COUNT) {
        // eslint-disable-next-line
        console.error('Math error: Potential infinite loop for expression: ' + print.ascii(originalNode))
        goOn = false
      }
    }

    //
    // Post-process node.
    //

    // Possible improvement: Optimize it.
    const newNode       = kemuSortArgs(clone(oldNode))
    const oldNodeAsText = print.ascii(oldNode)
    const newNodeAsText = print.ascii(newNode)

    if (oldNodeAsText !== newNodeAsText) {
      steps.push(Node.Status.nodeChanged(ChangeTypes.REARRANGE_COEFF, newNode))

      if (options.onStepCb) {
        options.onStepCb({
          changeType: ChangeTypes.REARRANGE_COEFF,
          oldNode: oldNode,
          newNode: newNode
        })
      }
      node = newNode
    }
  }

  if (steps.length > 0) {
    return steps[steps.length - 1].newNode
  } else {
    return node
  }
}

function logSteps(nodeStatus) {
  // eslint-disable-next-line
  console.log(nodeStatus.changeType);
  // eslint-disable-next-line
  console.log(print.ascii(nodeStatus.newNode));

  if (nodeStatus.substeps.length > 0) {
    // eslint-disable-next-line
    console.log('substeps: ');
    nodeStatus.substeps.forEach((substep, idx) => {
      console.log('...', idx, '|', print.ascii(substep.newNode))
    })
  }
}

module.exports = {
  oldApi: function (node, options={}) {
    const steps = []

    stepThrough(node, {
      isDebugMode: options.isDebugMode,
      expressionCtx: options.expressionCtx,
      onStepCb: (oneStep) => {
        steps.push(oneStep)
      }
    })

    return steps
  },

  newApi: function (node, options={}) {
    return stepThrough(node, options)
  }
}
