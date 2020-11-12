# Mathsteps - A step by step solver for math

[![CircleCI](https://circleci.com/gh/kemu-studio/mathsteps.svg?style=svg)](https://app.circleci.com/pipelines/github/kemu-studio/mathsteps.svg)
[![Git Commit](https://img.shields.io/github/last-commit/kemu-studio/mathsteps.svg?style=flat)](https://github.com/kemu-studio/mathsteps/commits/master)

# Demo ![Calculla.com](https://calculla.com/g/calculla_logo_small_32.png)

To see this version of mathsteps in action go to [calculla.com](https://calculla.com). For example it's used in [Sum of angles calculator](https://calculla.com/sum_of_angles_in_triangle), so you can put something like "1/3 pi" into alpha and beta angles and it will show you all steps needed to achieve "1/3 pi" result.

## Requirements

Mathsteps requires Node version > 6.0.0

## Usage

To install mathsteps using npm:

    npm install mathsteps

```js
const mathsteps = require('mathsteps');

const steps = mathsteps.simplifyExpression('2x + 2x + x + x');

steps.forEach(step => {
        console.log("before change: " + step.oldNode.toString());   // before change: 2 x + 2 x + x + x
        console.log("change: " + step.changeType);                  // change: ADD_POLYNOMIAL_TERMS
        console.log("after change: " + step.newNode.toString());    // after change: 6 x
        console.log("# of substeps: " + step.substeps.length);      // # of substeps: 3
});
```

To solve an equation:
```js
const result = mathsteps.solveEquation({
  equationAsText: '2x + 3x = 35',
  unknownVariable: 'x',
  onStepCb: function(step) {
    console.log(`[ ${step.equation.getId()} ] ${step.stepId} | ${step.equation}`)
  }
})
```

(if you're using mathsteps v0.1.6 or lower, use `.print()` instead of `.ascii()`)

To see all the change types:
```js
const changes = mathsteps.ChangeTypes;
```

## Contributing

Hi! If you're interested in working on this, that would be super awesome!
Learn more here: [CONTRIBUTING.md](CONTRIBUTING.md).

## Build

First clone the project from github:

    git clone https://github.com/socraticorg/mathsteps.git
    cd mathsteps

Install the project dependencies:

    npm ci

## Test

To execute tests for the library, install the project dependencies once:

    npm ci

Then, the tests can be executed:

    npm test
