const simplifyCommon = require('./../_common')
const ChangeTypes = require('../../ChangeTypes')
const Node = require('../../node')

const poolOfRules = [
  // Power.
  {l: 'n^0' , r: '1' , id: ChangeTypes.REDUCE_EXPONENT_BY_ZERO},
  {l: 'n^1' , r: 'n' , id: ChangeTypes.REMOVE_EXPONENT_BY_ONE},
  {l: '0^n' , r: '0' , id: ChangeTypes.REMOVE_EXPONENT_BASE_ZERO},
  {l: '1^n' , r: '1' , id: ChangeTypes.REMOVE_EXPONENT_BASE_ONE},

  // Multiply.
  {l: '0*n'  , r: '0'  , id: ChangeTypes.MULTIPLY_BY_ZERO},
  {l: 'n*0'  , r: '0'  , id: ChangeTypes.MULTIPLY_BY_ZERO},
  {l: '-1*n' , r: '-n' , id: ChangeTypes.REMOVE_MULTIPLYING_BY_NEGATIVE_ONE},

  // TODO: {l: '1*n'  , r: 'n'  , id: ChangeTypes.REMOVE_MULTIPLYING_BY_ONE},
  // TODO: {l: 'n*1'  , r: 'n'  , id: ChangeTypes.REMOVE_MULTIPLYING_BY_ONE},

  // Division.
  {l: '0/n'  , r: '0' , id: ChangeTypes.REDUCE_ZERO_NUMERATOR},
  {l: 'n/1'  , r: 'n' , id: ChangeTypes.DIVISION_BY_ONE},

  // TODO: {l: 'n/-1' , r: '-n' , id: ChangeTypes.DIVISION_BY_NEGATIVE_ONE},

  // Addition.
  {l: 'n+0' , r: 'n' , id: ChangeTypes.REMOVE_ADDING_ZERO},
  {l: 'n-0' , r: 'n' , id: ChangeTypes.REMOVE_ADDING_ZERO},

  // Other.
  {l: 'c1/c2 * v1/c3' , r: 'c1 / (c2*c3) * v1' , id: ChangeTypes.REARRANGE_COEFF},
]

module.exports = function (node) {
  return simplifyCommon.applyRules(node, poolOfRules)
}
