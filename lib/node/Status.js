const clone = require('../util/clone')

const ChangeTypes = require('../ChangeTypes')
const Type = require('./Type')

// This represents the current (sub)expression we're simplifying.
// As we move step by step, a node might be updated. Functions return this
// status object to pass on the updated node and information on if/how it was
// changed.
// Status(node) creates a Status object that signals no change
class Status {
  constructor(changeType, oldNode, newNode, substeps = []) {
    if (!newNode) {
      throw Error('node is not defined')
    }
    if (changeType === undefined || typeof (changeType) !== 'string') {
      throw Error('changetype isn\'t valid')
    }

    this.changeType = changeType
    this.oldNode = oldNode
    this.newNode = newNode
    this.substeps = substeps
  }

  hasChanged() {
    return this.changeType !== ChangeTypes.NO_CHANGE
  }
}

// A wrapper around the Status constructor for the case where node hasn't
// been changed.
Status.noChange = function(node) {
  return new Status(ChangeTypes.NO_CHANGE, null, node)
}

// A wrapper around the Status constructor for the case of a change
// that is happening at the level of oldNode + newNode
// e.g. 2 + 2 --> 4 (an addition node becomes a constant node)
Status.nodeChanged = function(
  changeType, oldNode, newNode, defaultChangeGroup = true, steps = []) {
  if (defaultChangeGroup) {
    oldNode.changeGroup = 1
    newNode.changeGroup = 1
  }

  return new Status(changeType, oldNode, newNode, steps)
}

module.exports = Status
