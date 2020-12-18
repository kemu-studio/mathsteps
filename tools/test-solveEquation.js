const mathsteps = require('../index.js')

const result = mathsteps.solveEquation({
  equationAsText: 'x/(2/3) = 1',
  unknownVariable: 'x',
  onStepCb: function(step) {
    console.log(`[ ${step.equation.getId()} ] ${step.stepId} | ${step.equation}`)
  }
})

console.log('SOLUTIONS', result.getSolutionsAsText())