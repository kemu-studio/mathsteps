const mathsteps = require('../index.js')

const expr    = '(2+2)/x/6/(y-z)'
const exprObj = mathsteps.parseText(expr)

console.log('--------------------------')
console.log('BEFORE')
console.log('NODE:', exprObj)
console.log('Ascii:', mathsteps.print(exprObj))
console.log('LaTeX:', mathsteps.printAsTeX(exprObj))

const steps   = mathsteps.simplifyExpression(expr, true)
const newNode = steps[steps.length - 1].newNode

console.log('--------------------------')
console.log('STEPS')
steps.forEach((item) => {
  console.log(item.changeType, '|', mathsteps.print(item.newNode))// , '|', item.newNode)
})

console.log('--------------------------')
console.log('AFTER')
console.log('NODE:', newNode)
console.log('Ascii:', mathsteps.print(newNode))
console.log('LaTeX:', mathsteps.printAsTeX(newNode))
