// change the default mathjs configuration.
// We want to store all constants as big number.
//const math = require('mathjs')
const {create, all} = require('mathjs')

const math = create(all, {
  epsilon: 1e-12,
  matrix: 'Matrix',
  number: 'number',
  precision: 64,
  predictable: false,
  randomSeed: null
})

module.exports = {
  math
}