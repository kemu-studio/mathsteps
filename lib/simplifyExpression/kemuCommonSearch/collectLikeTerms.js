const {math} = require('../../../config')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')

const NODE_ONE = Node.Creator.constant(1)

function collectLikeTerms(node) {
  let rv = null

  if (node.op === '+') {
    const termsMap  = {}
    let   isChanged = false

    node.args.forEach((oneArg) => {
      // Possible improvement: Optimize it.
      let hash       = null
      let coeffs     = []
      let term       = oneArg
      let isNegative = false

      // Handle unary minus if needed.
      if (Node.Type.isUnaryMinus(oneArg)) {
        isNegative = true
        oneArg     = oneArg.args[0]
        term       = oneArg
      }

      if (oneArg.op === '*') {
        // c * n
        const remainingNodes = []

        oneArg.args.forEach((oneFactor) => {
          if (Node.Type.isConstantOrConstantFraction(oneFactor, true)) {
            // Constant - treat as coeff.
            // x * c * z
            //    ^^^
            coeffs.push(oneFactor)

          } else {
            // Not a constant - keep as term node.
            remainingNodes.push(oneFactor)
          }
        })

        if (coeffs.length > 0) {
          term = Node.Creator.operator('*', remainingNodes)
        } else {
          coeffs = [NODE_ONE]
        }

      } else if ((oneArg.op === '/') && Node.Type.isConstant(oneArg.args[1])) {
        // n / c: treat as 1/c * n
        coeffs = [Node.Creator.operator('/', [NODE_ONE, oneArg.args[1]])]
        term   = oneArg.args[0]

      } else if (Node.Type.isConstant(oneArg)) {
        // Just a constant number: c.
        // Treat as free term.
        hash   = '__freeTerm__'
        coeffs = [oneArg]

      } else {
        // General case.
        // Treat the whole expression as term with coefficient one: 1 n
        coeffs = [NODE_ONE]
      }

      // Apply default hash function if needed.
      if (hash == null) {
        hash = term.toString()
      }

      // Apply unary minus to coefficient if needed.
      // Example: -(3x)
      if (isNegative) {
        coeffs.forEach((c, idx) => {
          coeffs[idx] = Node.Creator.unaryMinus(c)
        })
      }

      // Load term info.
      let termInfo = termsMap[hash]

      if (termInfo == null) {
        // Term seen for the first time.
        // Create new bucket from the scratch.
        termInfo = {
          arrayOfCoeffs: [],
          node: term
        }

      } else {
        // Expression matched.
        // At least two terms will be collected together.
        isChanged = true
      }

      // Update coefficient.
      termInfo.arrayOfCoeffs = termInfo.arrayOfCoeffs.concat(coeffs)

      // Store updated term info.
      termsMap[hash] = termInfo
    })

    // Build new node if anything changed.
    if (isChanged) {
      const newArgs = []

      for (let hash in termsMap) {
        const termInfo = termsMap[hash]

        if (hash === '__freeTerm__') {
          // Special case: the free term.
          // Just put the constants as is.
          termInfo.arrayOfCoeffs.forEach((c) => {
            newArgs.push(c)
          })

        } else {
          // Default scenario: (c1 + c2 + c3 + ...) n.
          newArgs.push(Node.Creator.operator('*', [
            Node.Creator.operator('+', termInfo.arrayOfCoeffs),
            termInfo.node
          ]))
        }

        // Create final node: c1 n1 + c2 n2 + c3 n3 + ...
        const newNode = Node.Creator.operator('+', newArgs)

        // Build node status.
        rv = Node.Status.nodeChanged(
          ChangeTypes.COLLECT_AND_COMBINE_LIKE_TERMS, node, newNode)
      }
    }
  }

  return rv
}

module.exports = collectLikeTerms
