const {math} = require('../../../config')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')

function collectLikeTerms(node) {
  let rv = null

  if (node.op === '+') {
    const termsMap  = {}
    let   isChanged = false

    node.args.forEach((oneArg) => {
      // Possible improvement: Optimize it.
      let hash       = null
      let coeff      = 0
      let term       = oneArg
      let isNegative = false


      if (Node.Type.isUnaryMinus(oneArg)) {
        isNegative = true
        oneArg     = oneArg.args[0]
      }

      if ((oneArg.op === '*') && Node.Type.isConstant(oneArg.args[0], true)) {
        // c * n
        coeff = oneArg.args[0].value
        term  = Node.Creator.operator('*', oneArg.args.slice(1))
        hash  = term.toString()

      } else if (Node.Type.isConstant(oneArg)) {
        // Just a constant number: c.
        // Treat as free term.
        hash  = '_free'
        coeff = oneArg.value

      } else {
        // General case.
        // Treat the whole expression as term with coefficient one: 1 n
        coeff = 1
        hash  = oneArg.toString()
      }

      if (hash != null) {
        // Apply unary minus to coefficient if needed.
        // Example: -(3x)
        if (isNegative) {
          coeff = math.multiply(coeff, -1)
        }

        // Load term info.
        let termInfo = termsMap[hash]

        if (termInfo == null) {
          // Term seen for the first time.
          // Create new bucket from the scratch.
          termInfo = {
            coeff: 0,
            node: term
          }

        } else {
          // Expression matched.
          // At least two terms will be collected together.
          isChanged = true
        }

        // Update coefficient.
        termInfo.coeff = math.add(termInfo.coeff, coeff)

        // Store updated term info.
        termsMap[hash] = termInfo
      }
    })

    // Build new node if anything changed.
    if (isChanged) {
      const newArgs = []

      for (let hash in termsMap) {
        const termInfo = termsMap[hash]

        if (math.equal(termInfo.coeff, 0)) {
          // Terms are reduced eg. 5x - 2x - 3x gives 0x.
          // Skip the term.

        } else if (math.equal(termInfo.coeff, 1)) {
          // Skip explicit one coefficient: 1 n gives n.
          newArgs.push(termInfo.node)

        } else if (hash === '_free') {
          // Special case: the free term.
          // Just put the constant integer.
          newArgs.push(Node.Creator.constant(termInfo.coeff))

        } else {
          // Default scenario: c n.
          newArgs.push(Node.Creator.operator('*', [
            Node.Creator.constant(termInfo.coeff),
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

  // Default node status if nothing changed.
  if (rv == null) {
    rv = Node.Status.noChange(node)
  }

  return rv
}

module.exports = collectLikeTerms
