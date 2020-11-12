const removeExponentByOne = require('../../../lib/simplifyExpression/basicsSearch/obsolete/removeExponentByOne')

const testSimplify = require('./testSimplify')

describe('removeExponentByOne', function() {
  testSimplify('x^1', 'x', removeExponentByOne)
})
