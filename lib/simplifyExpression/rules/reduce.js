const math = require('mathjs')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')

const NODE_CONST_ONE = Node.Creator.constant(1)

function _getNodeTopArgs(node) {
  let rv = []

  if (node.op == '/') {
    if (node.args[0].op == '*') {
      rv = node.args[0].args
    } else {
      rv = [node.args[0]]
    }
  } else if (node.op == '*') {
    rv = node.args
  } else {
    rv = [node]
  }

  return rv
}

function _getNodeBottomArgs(node) {
  let rv = []

  if (node.op == '/') {
    if (node.args[1].op == '*') {
      rv = node.args[1].args
    } else {
      rv = [node.args[1]]
    }
  }

  return rv
}

function _buildNodeFromArgs(args) {
  let rv = null

  if (args.length == 0) {
    rv = NODE_CONST_ONE
  } else if (args.length == 1) {
    rv = args[0]
  } else {
    rv = Node.Creator.operator('*', args)
  }

  return rv
}

function _extractRootAndExponentNodes(node) {
  let rv = {
    root: null,
    exponent: null
  }

  if (node.op == '^') {
    rv.root     = node.args[0]
    rv.exponent = node.args[1]
  } else {
    rv.root     = node
    rv.exponent = NODE_CONST_ONE
  }

  return rv
}

function _reduceByArgs(topArgs, bottomArgs) {
  let reduced           = false
  let newNode           = null
  let reducedTopIdx     = -1
  let reducedBottomIdx  = -1
  let reducedTopNode    = null
  let reducedBottomNode = null
  let isNegative        = false

  // Search for reducable top-bottom pairs.
  searchLoop:
  for (let factorTopIdx in topArgs) {
    for (let factorBottomIdx in bottomArgs) {
      let factorTop    = topArgs[factorTopIdx]
      let factorBottom = bottomArgs[factorBottomIdx]

      // Handle minus in numerator.
      if (Node.Type.isUnaryMinus(factorTop)) {
        factorTop  = factorTop.args[0]
        isNegative = true
      }

      // Handle minus in denominator.
      if (Node.Type.isUnaryMinus(factorBottom)) {
        factorBottom = factorBottom.args[0]
        isNegative   = !isNegative
      }

      if (factorTop.equals(factorBottom)) {
        // Perferct reducable pair found.
        // x/x gives 1
        reduced = true

      } else if (Node.Type.kemuIsConstantInteger(factorTop) &&
                 Node.Type.kemuIsConstantInteger(factorBottom)) {
        // c1 / c2
        let   valueTop    = math.abs(factorTop.value)
        const valueBottom = math.abs(factorBottom.value)
        const valueGcd    = math.gcd(valueTop, valueBottom)

        if (math.unequal(valueGcd, 1)) {
          // GCD(c1, c2) is not one - we can simplify fraction.
          reduced = true

          const signTop    = math.sign(factorTop.value)
          const signBottom = math.sign(factorBottom.value)
          const signResult = math.multiply(signTop, signBottom)

          if (math.isNegative(signResult)) {
            isNegative = !isNegative
          }

          // Divide numerator and denominator by GCD.
          reducedTopNode = Node.Creator.operator('/', [
            Node.Creator.constant(math.divide(valueTop, valueGcd)),
            Node.Creator.constant(math.divide(valueBottom, valueGcd)),
          ])
        }

      } else {
        let explodedTop    = _extractRootAndExponentNodes(factorTop)
        let explodedBottom = _extractRootAndExponentNodes(factorBottom)

        if (explodedTop.root.equals(explodedBottom.root) &&
           (Node.Type.isConstant(explodedTop.exponent)) &&
           (Node.Type.isConstant(explodedBottom.exponent))) {

          reduced = true

          const exponentValueTop    = explodedTop.exponent.value
          const exponentValueBottom = explodedBottom.exponent.value

          if (math.larger(exponentValueTop, exponentValueBottom)) {
            // x^2/x gives x
            const newExponent = Node.Creator.operator('-', [explodedTop.exponent, explodedBottom.exponent])
            reducedTopNode    = Node.Creator.operator('^', [explodedTop.root, newExponent])

          } else {
            // x/x^2 gives 1/x
            const newExponent = Node.Creator.operator('-', [explodedBottom.exponent, explodedTop.exponent])
            reducedBottomNode = Node.Creator.operator('^', [explodedBottom.root, newExponent])
          }
        }
      }

      // Don't go on anymore if top-bottom pair matched.
      if (reduced) {
        reducedTopIdx    = factorTopIdx
        reducedBottomIdx = factorBottomIdx
        break searchLoop
      }
    }
  }

  // Build result node if any reduction performed.
  if (reduced) {
    let newTopArgs    = []
    let newBottomArgs = []

    // Build up numerator (top) from single factors.
    for (let idx = 0; idx < topArgs.length; idx++) {
      if (idx == reducedTopIdx) {
        if (reducedTopNode != null) {
          newTopArgs.push(reducedTopNode)
        }
      } else {
        newTopArgs.push(topArgs[idx])
      }
    }

    // Build up denominator (bottom) from single factors.
    for (let idx = 0; idx < bottomArgs.length; idx++) {
      if (idx == reducedBottomIdx) {
        if (reducedBottomNode != null) {
          newBottomArgs.push(reducedBottomNode)
        }
      } else {
        newBottomArgs.push(bottomArgs[idx])
      }
    }

    if (newBottomArgs.length > 0) {
      const topNode    = _buildNodeFromArgs(newTopArgs)
      const bottomNode = _buildNodeFromArgs(newBottomArgs)
      newNode = Node.Creator.operator('/', [topNode, bottomNode])
    } else {
      newNode = _buildNodeFromArgs(newTopArgs)
    }

    // Keep sign for: -x/x like.
    if (isNegative) {
      newNode = Node.Creator.unaryMinus(newNode)
    }
  }

  const rv = {
    reduced: reduced,
    newNode: newNode
  }
  return rv
}

function reduce(node) {
  let rv = null

  if (node.op == '*') {
    const leftNode  = node.args[0]
    const rightNode = node.args[1]

    if ((leftNode.op == '/') || (rightNode.op == '/')) {
      // Collect factors from both sides.
      let leftTopArgs    = _getNodeTopArgs(leftNode)
      let leftBottomArgs = _getNodeBottomArgs(leftNode)

      let rightTopArgs    = _getNodeTopArgs(rightNode)
      let rightBottomArgs = _getNodeBottomArgs(rightNode)

      let topArgs    = leftTopArgs.concat(rightTopArgs)
      let bottomArgs = leftBottomArgs.concat(rightBottomArgs)

      let reduceResult = _reduceByArgs(topArgs, bottomArgs)

      if (reduceResult.reduced) {
        rv = Node.Status.nodeChanged(ChangeTypes.KEMU_REDUCE, reduceResult.newNode)
      }
    }

    if (rv == null) {
      // x * (-y) * z gives -x * y * z
      let   isNegative = null
      const newArgs    = []

      node.args.forEach((oneArg, idx) => {
        if ((idx > 0) && Node.Type.isUnaryMinus(oneArg, true)) {
          isNegative = !(isNegative || false)
          oneArg     = oneArg.args[0]
        }
        newArgs.push(oneArg)
      })

      if (isNegative !== null) {
        const newNode = Node.Creator.unaryMinus(Node.Creator.operator('*', newArgs))
        rv = Node.Status.nodeChanged(ChangeTypes.SIMPLIFY_SIGNS, newNode)
      }
    }

  } else if (node.op == '/') {
    let topArgs      = _getNodeTopArgs(node)
    let bottomArgs   = _getNodeBottomArgs(node)
    let reduceResult = _reduceByArgs(topArgs, bottomArgs)

    // console.log('TOP    :', topArgs)
    // console.log('BOTTOM :', bottomArgs)

    if (reduceResult.reduced) {
      rv = Node.Status.nodeChanged(ChangeTypes.KEMU_REDUCE, reduceResult.newNode)
    }
  }

  return rv
}

module.exports = reduce
