const Node = require('../node')

function _printInternal(node, options) {
  let rv = null

  // Apply custom handler first.
  if (options.customRender) {
    rv = options.customRender(node, options)
  }

  // Use default render if custom function returns nothing.
  if (rv == null) {
    // Possible improvement: Move to better place?
    if (Node.Type.isUnaryMinus(node) &&
        Node.Type.isConstant(node.args[0])) {
      // -c
      rv = '-' + _printInternal(node.args[0], options)

    } else if ((Node.Type.isNthRoot(node)) &&
               (!node.args[1] || Node.Type.kemuIsConstantInteger(node.args[1], 2))) {
      // nthRoot(x,2) -> \sqrt(x)
      // sqrt(x)      -> \sqrt(x)
      rv = 'sqrt(' + _printInternal(node.args[0], options) + ')'

    } else if (node.args) {
      // a op b op c op ...
      // fn(a,b,c,...)
      let opForPresentation        = ''
      let nextItemForPresentation  = ''
      let prevItemForPresentation  = ''
      let prevItem                 = null
      let wrapItemIntoParenthesis  = false

      let op = node.op || ','

      rv = ''

      // Render arguments ony-by-one: a op b op c op d op ...
      node.args.forEach((nextItem) => {
        // Render next argument.
        nextItemForPresentation = _printInternal(nextItem, options)
        wrapItemIntoParenthesis = false

        // Preprocess sign.
        // We use it as helper in further steps.
        let doesNextItemBeginWithMinus         = false
        let nextItemForPresentationWithoutSign = nextItemForPresentation

        if (nextItemForPresentation[0] === '-') {
          // Ascii or LaTeX: -x
          doesNextItemBeginWithMinus         = true
          nextItemForPresentationWithoutSign = nextItemForPresentation.substr(1)

        } else if (options.isLatexMode && (nextItemForPresentation.substr(0, 7) === '\\frac{-')) {
          // LaTeX: \frac{-x}{y}
          doesNextItemBeginWithMinus         = true
          nextItemForPresentationWithoutSign = '\\frac{' + nextItemForPresentation.substr(7)
        }

        // Operator specific code.
        switch (op) {
          case '+': {
            if (prevItem) {
              if (doesNextItemBeginWithMinus) {
                nextItemForPresentation = nextItemForPresentationWithoutSign
                if (prevItem) {
                  opForPresentation = options.isLatexMode ? '-' : ' - '
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
            if (prevItem) {
              opForPresentation = options.symbolForMultiplyExplicit

              if (Node.Type.isPolynomialTerm(node)) {
                if ((prevItemForPresentation.includes('/')) &&
                    (prevItemForPresentation[0] === '-')) {
                  // Fix for -20/9q vs -20/9*q
                  opForPresentation = options.symbolForMultiplyImplicitShort

                } else {
                  // Skip multiply for 2x like terms.
                  opForPresentation = options.symbolForMultiplyImplicit
                }
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

            if (prevItem && options.isLatexMode) {
              wrapItemIntoParenthesis = false
              nextItemForPresentation = '{' + nextItemForPresentation + '}'
            }

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
          nextItemForPresentation = options.openParenthesis
                                  + nextItemForPresentation
                                  + options.closeParenthesis
        }

        // Output next argument to output.
        rv += opForPresentation
        rv += nextItemForPresentation

        if (options.isLatexMode) {
          opForPresentation = op
        } else {
          opForPresentation = ' ' + op + ' '
        }

        // Go to next argument if any.
        prevItem                = nextItem
        prevItemForPresentation = nextItemForPresentation
      })

      // Function name if any.
      // f(...)
      if (Node.Type.isFunction(node)) {
        rv = (node.fn.nameForPresentation || node.fn.name)
           + options.openParenthesis
           + rv
           + options.closeParenthesis
      }
    }
  }

  if (rv == null) {
    rv = node.toString({notation: 'fixed'})
  }

  return rv.trim()
}

function printAscii(node) {
  return _printInternal(node, {
    openParenthesis: '(',
    closeParenthesis: ')',
    symbolForMultiplyExplicit: ' * ',
    symbolForMultiplyImplicitShort: '*',
    symbolForMultiplyImplicit: ''
  })
}

function printLatex(node) {
  return _printInternal(node, {
    // LaTeX specific render.
    isLatexMode: true,
    openParenthesis: '\\left(',
    closeParenthesis: '\\right)',
    symbolForMultiplyExplicit: ' \\cdot ',
    symbolForMultiplyImplicitShort: ' \\cdot ',
    symbolForMultiplyImplicit: '~',

    customRender: function (node) {
      let rv = null

      if (Node.Type.isNthRoot(node)) {
        // Fetch arguments.
        const x = node.args[0]
        const n = node.args[1]
        const xForPresentation = printLatex(x)

        if (n && !Node.Type.kemuIsConstantInteger(n, 2)) {
          // nthRoot(x,n) -> \sqrt[n]{x}
          const nForPresentation = printLatex(n)
          rv = '\\sqrt[' + nForPresentation + ']{' + xForPresentation + '}'

        } else {
          // nthRoot(x,2) -> \sqrt(x)
          // sqrt(x)      -> \sqrt(x)
          rv = '\\sqrt{' + xForPresentation + '}'
        }

      } else if (node.op === '/') {
        // x/y -> \frac{x}{y}
        const x = printLatex(node.args[0])
        const y = printLatex(node.args[1])
        rv = `\\frac{${x}}{${y}}`

      } else if (Node.Type.isSymbol(node)) {
        rv = node.toTex()

      } else if (Node.Type.isFunction(node, 'abs')) {
        // abs(x) -> |x|
        const x = printLatex(node.args[0])
        rv = `\\left|${x}\\right|`

      } else if (node.type === 'AssignmentNode') {
        const x = printLatex(node.object)
        const y = printLatex(node.value)
        rv = x + '=' + y
      }

      return rv
    }
  })
}

module.exports = {
  ascii: printAscii,
  latex: printLatex,
}
