const {math}       = require('../../config')
const Node         = require('../node')
const simplifyCore = require('./kemuCommonSearch/simplifyCore')
const clone        = require('../util/clone')

let deepIdx = 0

function logEnter(msg) {
  process.stdout.write(' '.repeat(deepIdx * 2) + '-> ')
  console.log.apply(console, arguments)
  deepIdx++
}

function logLeave() {
  deepIdx--
  process.stdout.write(' '.repeat(deepIdx * 2) + '<- ')
  console.log.apply(console, arguments)
}

function log() {
  process.stdout.write(' '.repeat(deepIdx * 2))
  console.log.apply(console, arguments)
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
  if (node == null) {
    // Do nothing.

  } else if (node.type === 'ParenthesisNode') {
    // (...) - enter into node.
    node = kemuNormalizeConstantNodes(node.content)

  } else if (Node.Type.isConstant(node)) {
    // Constant node. Make sure we store value as bignumber.
    node.value = math.bignumber(node.value)

  } else if (Node.Type.isUnaryMinus(node) && Node.Type.isConstant(node.args[0])) {
    // Negative constant node.
    // Make sure we store value as bignumber.
    node       = clone(node.args[0])
    node.value = math.multiply(math.bignumber(node.value), -1)

  } else if (Node.Type.isFunction(node, 'nthRoot') && !node.args[1]) {
    // nthRoot(x, null) -> nthRoot(x, 2)
    node.args[0] = kemuNormalizeConstantNodes(node.args[0])
    node.args[1] = Node.Creator.constant(2)

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

function _explodeNodeArgs(node, op) {
  // [2x, a, b] gives [2, x, a, b]
  let rv = []

  node.args.forEach((oneArg) => {
    if (oneArg.op === op) {
      rv = rv.concat(_explodeNodeArgs(oneArg, op))
    } else {
      rv.push(oneArg)
    }
  })

  return rv
}

function kemuFlatten(node) {
  let rv = node

  if (node.args) {
    // Flatten args recursively.
    node.args.forEach((oneChild, idx) => {
      node.args[idx] = kemuFlatten(oneChild)
    })

    if (Node.Type.isOperator(node)) {
      switch (node.op) {
        case '*':
        case '+': {
          // Flatten nested multiply/add e.g. (3*x)*y =>3*x*y
          node.args = _explodeNodeArgs(node, node.op)
          break
        }

        case '-': {
          // Convert a-b to a+(-b).
          const x = node.args[0]
          const y = node.args[1]

          const args  = Node.Type.isOperator(x, '+') ? _explodeNodeArgs(x, '+') : [x]
          const argsY = Node.Type.isOperator(y, '+') ? _explodeNodeArgs(y, '+') : [y]

          // Possible improvement: Optimize it.
          argsY.forEach((item) => {
            args.push(Node.Creator.unaryMinus(item))
          })

          rv = Node.Creator.operator('+', args)

          break
        }
      }
    }
  }

  return rv
}

module.exports = {
  logEnter,
  logLeave,
  log,
  applyRules,
  kemuNormalizeConstantNodes,
  kemuFlatten
}
