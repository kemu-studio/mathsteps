const {math}       = require('../../config')
const Node         = require('../node')
const simplifyCore = require('./kemuCommonSearch/simplifyCore')
const clone        = require('../util/clone')

let deepIdx = 0

function logEnter(msg) {
  process.stdout.write(' '.repeat(deepIdx * 2) + '-> ')
  console.log.apply(console, arguments);
  deepIdx++
}

function logLeave() {
  deepIdx--
  process.stdout.write(' '.repeat(deepIdx * 2) + '<- ')
  console.log.apply(console, arguments);
}

function log() {
  process.stdout.write(' '.repeat(deepIdx * 2))
  console.log.apply(console, arguments);
}

function applyRules(node, poolOfRules) {
  let rv = Node.Status.noChange(node)

  // Possible improvement: catch many steps at once.
  const steps = simplifyCore(node, poolOfRules, null, {stopOnFirstStep: true})

  if (steps.length > 0) {
    const oneStep = steps[0]
    rv = Node.Status.nodeChanged(
      oneStep.ruleApplied.id,  node, oneStep.nodeAfter)
  }

  return rv
}

// Make sure we store all constant nodes as bignumber to avoid fake unequals.
function kemuNormalizeConstantNodes(node) {
  if (Node.Type.isConstant(node)) {
    // Constant node. Make sure we store value as bignumber.
    node.value = math.bignumber(node.value)

  } else if (Node.Type.isUnaryMinus(node) && Node.Type.isConstant(node.args[0])) {
    // Negative constant node.
    // Make sure we store value as bignumber.
    node       = clone(node.args[0])
    node.value = math.multiply(math.bignumber(node.value), -1)

  } else {
    // Non constant-node. Go on recurisively if possible.
    if (node.args) {
      node.args.forEach((childNode, idx) => {
        node.args[idx] = kemuNormalizeConstantNodes(childNode)
      })
    }
  }

  return node
}

module.exports = {
  logEnter,
  logLeave,
  log,
  applyRules,
  kemuNormalizeConstantNodes
}
