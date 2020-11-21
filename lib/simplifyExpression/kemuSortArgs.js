const Node = require('../node')

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

function _getPow(node) {
  let rv = 0

  if (Node.Type.isOperator(node)) {
    if ((node.op === '^') && Node.Type.isSymbol(node.args[0])) {
      // x^n -> the effective power is n
      // Possible improvement: Handle bignumber exponents?
      rv = parseInt(node.args[1].value)

    } else {
      // x op y - parse each argument recursively.
      // Example: 2 * x * y^3
      node.args.forEach((oneChild) => {
        rv += _getPow(oneChild)
      })
    }

  } else if (Node.Type.isSymbol(node)) {
    // x - the effective power is 1
    rv = 1

  } else if (node.content) {
    // (...) - go into parentheses.
    rv = _getPow(node.content)

  } else if (Node.Type.isFunction(node)) {
    // Dirty workaround to move sqrt(2) like terms to the right.
    // Example: 2 + sqrt(2)
    rv = -1
  }

  return rv
}

function _sortNodesByPow(nodes) {
  nodes.sort((a, b) => {
    const powA = _getPow(a)
    const powB = _getPow(b)

    if (powA > powB) {
      return -1
    } else if (powA < powB) {
      return 1
    } else {
      return 0
    }
  })
}

function _sortNodesByName(nodes) {
  nodes.sort((nodeA, nodeB) => {
    a = nodeA.toString()
    b = nodeB.toString()

    // Dirty workaround to move sqrt(2) like factors to the right.
    if (Node.Type.isFunction(nodeA)) {
      a = '|fct|' + a
    }

    if (Node.Type.isFunction(nodeB)) {
      b = '|fct|' + b
    }

    // Compare nodes as text.
    if (a < b) {
      return -1

    } else if (a > b) {
      return 1

    } else {
      return 0
    }
  })
}

function _kemuSortArgs(node) {
  if (!node._kemuIsSorted) {
    // Avoid sorting the same node twice.
    node._kemuIsSorted = true

    if (node.args) {
      // Sort args recursively.
      node.args.forEach((oneChild) => {
        _kemuSortArgs(oneChild)
      })

      switch (node.op) {
        case '*': {
          const numbers = []
          const other   = []

          // Flatten nested multiply e.g. (3*x)*y =>3*x*y
          node.args = _explodeNodeArgs(node, '*')

          // Divide child into 3 groups:
          // - number constants e.g. 3.14,
          // - other nodes e.g. x + a/4
          node.args.forEach((oneChild) => {
            if (Node.Type.isConstantOrConstantFraction(oneChild)) {
              // Constant number node e.g. 3.14
              numbers.push(oneChild)

            } else if (Node.Type.isUnaryMinus(oneChild) &&
                       Node.Type.isConstantOrConstantFraction(oneChild.args[0])) {
              // Constant negated number node e.g. -3.14
              // Possible improvement: Handle negated symbols (-x).
              numbers.push(oneChild)

            } else {
              // Other node e.g. (x + a/4)
              other.push(oneChild)
            }
          })

          // Sort nodes within groups.
          _sortNodesByName(other)

          // Join node groups in the following order:
          // | unsorted constants | sorted complex nodes |
          let newArgs = []
          newArgs = newArgs.concat(numbers)
          newArgs = newArgs.concat(other)

          // Apply new args order.
          node.args = newArgs

          break
        }

        case '+': {
          // Flatten nested addition e.g. (3+x)+y => 3 + x + y
          node.args = _explodeNodeArgs(node, '+')
          _sortNodesByPow(node.args)

          break
        }
      }
    }
  }
}

module.exports = _kemuSortArgs
