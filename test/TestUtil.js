const assert = require('assert')

const simplifyCommon = require('../lib/simplifyExpression/_common')
const flatten   = simplifyCommon.kemuFlatten
const print     = require('../lib/util/print')
const mathsteps = require('../index.js')

// TestUtil contains helper methods to share code across tests
const TestUtil = {}

// Takes in an input string and returns a flattened and parsed node
TestUtil.parseAndFlatten = function (exprString) {
  return flatten(mathsteps.parseText(exprString))
}

// Tests a function that takes an input string and check its output
TestUtil.testFunctionOutput = function (fn, input, output) {
  it(input + ' -> ' + output,  () => {
    assert.deepEqual(fn(input),output)
  })
}

// tests a function that takes in a node and returns a boolean value
TestUtil.testBooleanFunction = function (simplifier, exprString, expectedBooleanValue) {
  it(exprString + ' ' + expectedBooleanValue, () => {
    const inputNode = flatten(mathsteps.parseText(exprString))
    assert.equal(simplifier(inputNode),expectedBooleanValue)
  })
}

// Tests a simplification function
TestUtil.testSimplification = function (simplifyingFunction, exprString,
  expectedOutputString) {
  it (exprString + ' -> ' + expectedOutputString,  () => {
    assert.deepEqual(
      print.ascii(simplifyingFunction(flatten(mathsteps.parseText(exprString))).newNode),
      expectedOutputString)
  })
}

// Test the substeps in the expression
TestUtil.testSubsteps = function (fn, exprString, outputList,
  outputStr) {
  it(exprString + ' -> ' + outputStr, () => {
    const status = fn(flatten(mathsteps.parseText(exprString)))
    const substeps = status.substeps

    assert.deepEqual(substeps.length, outputList.length)
    substeps.forEach((step, i) => {
      assert.deepEqual(
        print.ascii(step.newNode),
        outputList[i])
    })
    if (outputStr) {
      assert.deepEqual(
        print.ascii(status.newNode),
        outputStr)
    }
  })
}

TestUtil.testSimplifySteps = function (exprString, expectedSteps) {
  it (exprString + ' -> ' + expectedSteps[expectedSteps.length - 1].expr,  () => {
    const steps = mathsteps.simplifyExpression(exprString)

    console.log('STEPS          :', steps)
    console.log('EXPECTED STEPS :', expectedSteps)

    assert.deepEqual(steps.length, expectedSteps.length)

    steps.forEach((oneStep, idx) => {
      console.log(oneStep, expectedSteps[idx])

      assert.deepEqual(print.ascii(oneStep.newNode),    expectedSteps[idx].expr)
      assert.deepEqual(print.ascii(oneStep.changeType), expectedSteps[idx].changeType)
    })
  })
}

// Remove some property used in mathjs that we don't need and prevents node
// equality checks from passing
TestUtil.removeComments = function(node) {
  node.filter(node => node.comment !== undefined).forEach(
    node => delete node.comment)
}

module.exports = TestUtil
