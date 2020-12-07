// Simple clone function, which creates a deep copy of the given node
// And recurses on the children (due to the shallow nature of the mathjs node
// clone)
function clone(node) {
  let copy = null

  try {
    copy = node.clone()

    if (node.args) {
      node.args.forEach((child, i) => {
        copy.args[i] = clone(child)
      })
    }

    if (node._kemuIsSorted) {
      copy._kemuIsSorted = true
      if (node.fn && node.fn.nameForPresentation) {
        copy.fn.nameForPresentation = node.fn.nameForPresentation
      }
    }

  } catch (err) {
    // Do nothing.
  }

  return copy
}

module.exports = clone
