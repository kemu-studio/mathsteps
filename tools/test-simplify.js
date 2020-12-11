const mathsteps = require('../index.js')
const expr      = '2 / (4x)'
const exprObj   = mathsteps.parseText(expr)

console.log('--------------------------')
console.log('BEFORE')
console.log('NODE:', exprObj)
console.log('Ascii:', mathsteps.print(exprObj))
console.log('LaTeX:', mathsteps.printAsTeX(exprObj))
console.log()

console.log('--------------------------')
console.log('STEPS')
const newNode = mathsteps.simplifyExpression({
  expressionAsText: expr,
  onStepCb: (item) => {
    console.log(item.changeType, '|', mathsteps.print(item.newNode))
  }
})

console.log()
console.log('--------------------------')
console.log('AFTER')
console.log('NODE:', newNode)
console.log('Ascii:', mathsteps.print(newNode))
console.log('LaTeX:', mathsteps.printAsTeX(newNode))
