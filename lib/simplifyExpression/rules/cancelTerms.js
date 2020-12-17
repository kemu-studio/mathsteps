const math = require('mathjs')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')
const clone = require('../../util/clone')

const NODE_CONST_ONE  = Node.Creator.constant(1)
const NODE_CONST_ZERO = Node.Creator.constant(0)

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
  let reducedTotal = false
  let newNode      = null
  let isNegative   = null
  let rv           = null

  // Possible improvement: optimize it.
  const originalTopArgs    = topArgs
  const originalBottomArgs = bottomArgs

  topArgs    = topArgs.slice()
  bottomArgs = bottomArgs.slice()

  // Search for reducable top-bottom pairs.
  for (let factorTopIdx in topArgs) {
    for (let factorBottomIdx in bottomArgs) {
      let reduced           = false
      let reducedTopNode    = null
      let reducedBottomNode = null

      // Load factors pair to scan (top-bottom):
      // ... * topFactor * ...
      // -------------------------
      // ... * bottomFactor * ...
      let factorTop    = topArgs[factorTopIdx]
      let factorBottom = bottomArgs[factorBottomIdx]

      if (!factorTop || !factorBottom) {
        continue
      }

      // Handle minus in numerator.
      if (Node.Type.isUnaryMinus(factorTop)) {
        factorTop  = factorTop.args[0]
        isNegative = !(isNegative || false)
      }

      // Handle minus in denominator.
      if (Node.Type.isUnaryMinus(factorBottom)) {
        factorBottom = factorBottom.args[0]
        isNegative   = !(isNegative || false)
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
        topArgs[factorTopIdx]       = reducedTopNode
        bottomArgs[factorBottomIdx] = reducedBottomNode
        reducedTotal                = true

      } else {
        topArgs[factorTopIdx]       = factorTop
        bottomArgs[factorBottomIdx] = factorBottom
      }
    }
  }

  // Build result node if any reduction performed.
  if (reducedTotal) {
    // Possible improvement: Create altForm only when needed by caller.
    // Build alternative form.
    const altFormTopArgs    = []
    const altFormBottomArgs = []

    topArgs.forEach((unused, idx) => {
      if (originalTopArgs[idx] !== topArgs[idx]) {
        altFormTopArgs[idx] = clone(originalTopArgs[idx])
        altFormTopArgs[idx].renderCross = true
      } else {
        altFormTopArgs[idx] = originalTopArgs[idx]
      }
    })

    bottomArgs.forEach((unused, idx) => {
      if (originalBottomArgs[idx] !== bottomArgs[idx]) {
        altFormBottomArgs[idx] = clone(originalBottomArgs[idx])
        altFormBottomArgs[idx].renderCross = true
      } else {
        altFormBottomArgs[idx] = originalBottomArgs[idx]
      }
    })

    // Remove null factors.
    let newTopArgs    = topArgs.filter(item => item)
    let newBottomArgs = bottomArgs.filter(item => item)

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

    // Build result object.
    rv = {
      changeType: ChangeTypes.CANCEL_TERMS,
      newNode: newNode,
      altForms: [
        {
          altFormType: 'aftCancelTermsCrossOutInfo',
          node: Node.Creator.operator('/', [
            Node.Creator.operator('*', altFormTopArgs),
            Node.Creator.operator('*', altFormBottomArgs)
          ])
        }
      ]
    }
  }

  return rv
}

function cancelTerms(node) {
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

      rv = _reduceByArgs(topArgs, bottomArgs)
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
        rv = {
          changeType: ChangeTypes.SIMPLIFY_SIGNS,
          newNode: Node.Creator.unaryMinus(Node.Creator.operator('*', newArgs))
        }
      }
    }

  } else if (node.op === '/') {
    let topArgs    = _getNodeTopArgs(node)
    let bottomArgs = _getNodeBottomArgs(node)
    rv = _reduceByArgs(topArgs, bottomArgs)

  } else if (node.op === '+') {
    // ... + a + b + c + ...
    // Possible improvement: Optimize it.
    const altFormTerms = node.args.slice()
    const newTerms     = []

    for (let i = 0; i < altFormTerms.length; i++) {
      // Fetch next term.
      const nodeX = altFormTerms[i]

      if (!nodeX.renderCross) {
        // Search for matched x - x like pair (gives 0).
        let isCancelledOut = false

        for (let j = i + 1; j < altFormTerms.length; j++) {
          // ... x + ... + y + ...
          const nodeY = altFormTerms[j]

          if (!nodeY.renderCross) {
            if ((Node.Type.isUnaryMinus(nodeY) && nodeX.equals(nodeY.args[0])) ||
                (Node.Type.isUnaryMinus(nodeX) && nodeY.equals(nodeX.args[0]))) {
              // ... + x + ... - x ...
              //      ^^^      ^^^
              // or
              // ... - x + ... + x ...
              //     ^^^       ^^^
              altFormTerms[j] = clone(nodeY)
              altFormTerms[j].renderCross = true
              isCancelledOut = true
              break
            }
          }
        }

        // Update terms if needed.
        if (isCancelledOut) {
          nodeX.renderCross = true

        } else {
          newTerms.push(nodeX)
        }
      }
    }

    // Build result object if changed.
    if (newTerms.length !== node.args.length) {
      let newNode = NODE_CONST_ZERO

      if (newTerms.length == 1) {
        // x
        newNode = newTerms[0]

      } else if (newTerms.length > 1) {
        // a + b + c + ...
        newNode = Node.Creator.operator('+', newTerms)
      }

      rv = {
        changeType: ChangeTypes.CANCEL_TERMS,
        newNode: newNode,
        altForms: [
          {
            altFormType: 'aftCancelTermsCrossOutInfo',
            node: Node.Creator.operator('+', altFormTerms)
          }
        ]
      }
    }
  }

  return rv
}

module.exports = cancelTerms
