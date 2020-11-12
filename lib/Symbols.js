const Node = require('./node')

const Symbols = {}

// return the set of symbols in the expression tree
Symbols.getSymbolsInExpression = function(expression) {
  const symbolNodes = expression.filter(node => node.isSymbolNode) // all the symbol nodes
  const symbols = symbolNodes.map(node => node.name) // all the symbol nodes' names
  const symbolSet = new Set(symbols) // to get rid of duplicates
  return symbolSet
}

module.exports = Symbols
