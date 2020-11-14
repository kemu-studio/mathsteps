const clone = require('./clone')
const flatten = require('./flattenOperands')
const Node = require('../node')
const math = require('mathjs')

function printAscii(node) {
  let rv = null

  if (Node.Type.isParenthesis(node)) {
    // (...)
    node = node.content
  }

  // TODO: Move to better place?
  if (Node.Type.isUnaryMinus(node) && Node.Type.isConstant(node.args[0])) {
    rv = '-' + printAscii(node.args[0])

  } else if (node.args) {
    // a op b op c op ...
    // fn(a,b,c,...)
    let opForPresentation       = ''
    let nextItemForPresentation = ''
    let prevItemForPresentation = ''
    let prevItem                = null
    let wrapItemIntoParenthesis = false

    let op = node.op || ','

    rv = ''

    // Render arguments ony-by-one: a op b op c op d op ...
    node.args.forEach((nextItem) => {
      // Remove parenthesis if any.
      if (Node.Type.isParenthesis(nextItem)) {
        // (...)
        nextItem = nextItem.content
      }

      // Render next argument.
      nextItemForPresentation = printAscii(nextItem)
      wrapItemIntoParenthesis = false

      // Operator specific code.
      switch (op) {
        case '+': {
          if (prevItem) {
            if (nextItemForPresentation[0] === '-') {
              nextItemForPresentation = nextItemForPresentation.substr(1)
              if (prevItem) {
                opForPresentation = ' - '
              } else {
                opForPresentation = '-'
              }
            }
          }
          break
        }

        case '-': {
          if (prevItem) {
            // a op b op c op ...
            wrapItemIntoParenthesis =  (nextItemForPresentation[0] === '-')
                                    || '+-'.includes(nextItem.op)

          } else if (Node.Type.isUnaryMinus(node)) {
            // -x
            opForPresentation = '-'
            wrapItemIntoParenthesis =  (nextItemForPresentation[0] === '-')
                                    || '+-'.includes(nextItem.op)
          }

          break
        }

        case '*': {
          if (Node.PolynomialTerm.isPolynomialTerm(node)) {
            if ((prevItemForPresentation.includes('/')) &&
                (prevItemForPresentation[0] === '-')) {
              // Fix for -20/9q vs -20/9*q
              opForPresentation = '*'

            } else {
              // Skip multiply for 2x like terms.
              opForPresentation = ''
            }
          }
          wrapItemIntoParenthesis = '+-'.includes(nextItem.op)

          break
        }

        case '/': {
          if (Node.Type.isOperator(nextItem)) {
            // (...) / (...)
            if (prevItem) {
              // ... / (y)
              wrapItemIntoParenthesis = '+-*/'.includes(nextItem.op)
            } else {
              // (x) / ...
              wrapItemIntoParenthesis = '+-'.includes(nextItem.op)
            }

          } else if (prevItem &&
                     Node.Type.isConstant(prevItem, true) &&
                     Node.Type.isConstant(nextItem, true)) {
            // 1/2
            opForPresentation = '/'
          }

          break
        }

        case '^': {
          // x^y
          wrapItemIntoParenthesis = Node.Type.isOperator(nextItem)
          opForPresentation       = opForPresentation.trim()

          break
        }

        default: {
          if (prevItem) {
            opForPresentation = ', '
          }
        }
      }

      // Wrap item into parenthesis if needed.
      if (wrapItemIntoParenthesis) {
        nextItemForPresentation = '(' + nextItemForPresentation + ')'
      }

      // Output next argument to output.
      rv += opForPresentation
      rv += nextItemForPresentation
      opForPresentation = ' ' + op + ' '

      // Go to next argument if any.
      prevItem                = nextItem
      prevItemForPresentation = nextItemForPresentation
    })

    // Function name if any.
    // f(...)
    if (Node.Type.isFunction(node)) {
      rv = (node.fn.nameForPresentation || node.fn.name)
         + '(' + rv + ')'
    }
  }

  if (rv == null) {
    rv = node.toString({notation: 'fixed'})
  }

  return rv.trim()
}

function kemuAddParenthesisBeforePrintLatex(node) {
  if (node.content) {
    node = node.content
  }

  // Possible improvement: optimize it.
  if (node.args) {
    if (Node.Type.isUnaryMinus(node) &&
        Node.Type.kemuIsConstantNegative(node.args[0])) {

      node.kemuIsReadyForPrintLatex = true

      // Avoid double minus: --x.
      node._toTex = () => {
        return '-\\left(' + node.args[0].value + '\\right)'
      }

    } else {
      node.args.forEach((oneArg, argIdx) => {
        // We skip add operation (+), because it's already handled by
        // showPlusMinus fix in original mathsteps.
        const isRightArg        = (argIdx > 0)
        const isPowBase         = (node.op === '^') && (argIdx === 0)
        const isAddOp           = (node.op === '+')
        const shouldBeProcessed = !isAddOp && (isRightArg || isPowBase)

        if (shouldBeProcessed && Node.Type.kemuIsConstantNegative(oneArg)) {
          // Wrap negative cosntant arguments into parenthesis.
          oneArg._toTex = () => {
            return '\\left(' + oneArg.value + '\\right)'
          }

        } else if (!oneArg.kemuIsReadyForPrintLatex) {
          // Avoid processing the same node twice.
          oneArg.kemuIsReadyForPrintLatex = true

          // Process child nodes recursively.
          kemuAddParenthesisBeforePrintLatex(oneArg)
        }
      })
    }
  }
}

function _printLatexInternal(node, unused, usePerentheses=false) {
  let rv = null

  if (Node.Type.kemuIsConstantInteger(node)) {
    // Avoid sciencific notation for single integer.
    rv = printAscii(node)

    if (usePerentheses) {
      // (-x)
      usePerentheses = Node.Type.kemuIsConstantNegative(node)
    }

  } else if (Node.Type.isOperator(node) && (node.args.length == 2)) {
    // Fetch arguments: x, y.
    let useParenthesesForX = true
    let useParenthesesForY = true

    switch (node.op) {
      case '+': {
        // x + y
        useParenthesesForX = false
        useParenthesesForY = false
        break
      }

      case '-': {
        // x - (...)
        //
        //     ...
        // x - ---
        //     ...
        //
        // x - y^n
        useParenthesesForX = false
        useParenthesesForY = (node.args[1].op !== '/') && (node.args[1].op !== '^')
        break
      }

      case '*': {
        // (...) * (...)
        //
        // ...
        // --- * x
        // ...
        //
        // x^n * y^m
        useParenthesesForX = (node.args[0].op !== '/') && (node.args[0].op !== '^')
        useParenthesesForY = (node.args[1].op !== '/') && (node.args[1].op !== '^')

        break
      }

      case '^': {
        // (...) ^ (...)
        break
      }

      case '/': {
        // ...
        // ---
        // ...
        useParenthesesForX = false
        useParenthesesForY = false
        break
      }
    }

    const x = _printLatexInternal(node.args[0], null, useParenthesesForX)
    const y = _printLatexInternal(node.args[1], null, useParenthesesForY)

    // Render x op y
    switch (node.op) {
      case '+': {
        rv = `${x}+${y}`
        break
      }

      case '-': {
        rv = `${x}-${y}`
        break
      }

      case '^': {
        rv = `{${x}}^{${y}}`
        break
      }

      case '*': {
        if (node.implicit) {
          rv = `${x}~${y}`
        } else {
          rv = `${x}\\cdot${y}`
        }
        break
      }

      case '/': {
        rv = `\\frac{${x}}{${y}}`
        break
      }
    }

  } else if (Node.Type.isUnaryMinus(node)) {
    rv = '-' + _printLatexInternal(node.args[0], null, true)
  }

  if (rv == null) {
    // Fallback to default mathjs render.
    return node.toTex({
      parenthesis: 'keep'
    })
  }

  if (usePerentheses) {
    rv = '\\left(' + rv + '\\right)'
  }

  return rv
}

// Prints an expression node in LaTeX
// (The + - is needed to support the conversion of subtraction to addition of
// negative terms. See flattenOperands for more details if you're curious.)
function printLatex(node, showPlusMinus = false) {
  kemuAddParenthesisBeforePrintLatex(node)

  let nodeTex = node.toTex({
    handler: _printLatexInternal,
    parenthesis: 'keep'
  })

  if (!showPlusMinus) {
    // Replaces '+ -' with '-'
    nodeTex = nodeTex.replace(/\s*?\+\s*?\-\s*?/g, ' - ')
  }

  return nodeTex
}

module.exports = {
  ascii: printAscii,
  latex: printLatex,
}
