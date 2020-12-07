const mathsteps = require('../index.js')

const result = mathsteps.solveEquation({
  equationAsText: '4x^2 - 25y^2 = 0',
  unknownVariable: 'x',
  onStepCb: function(step) {
    console.log(`[ ${step.equation.getId()} ] ${step.stepId} | ${step.equation}`)
  }
})

console.log('SOLUTIONS', result.getSolutionsAsText())