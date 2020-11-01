const mathjs       = require('mathjs')
const Node         = require('../Node')
const simplifyCore = require('./kemuCommonSearch/simplifyCore')

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
    node.value = mathjs.bignumber(node.value)

  } else if (Node.Type.isUnaryMinus(node) && Node.Type.isConstant(node.args[0])) {
    // Negative constant node.
    // Make sure we store value as bignumber.
    node       = node.args[0]
    node.value = mathjs.multiply(mathjs.bignumber(node.value), -1)

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