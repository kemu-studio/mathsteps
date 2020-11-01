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

module.exports = {
  logEnter,
  logLeave,
  log,
  applyRules
}
