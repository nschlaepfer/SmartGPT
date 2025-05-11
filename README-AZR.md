# Absolute Zero Reasoner (AZR) for SmartGPT

This module implements the Absolute Zero Reasoner (AZR) approach for SmartGPT. AZR is a self-learning reasoning system that improves its abilities through a self-play loop without requiring human-curated datasets.

## What is Absolute Zero Reasoner?

Absolute Zero Reasoner is a novel paradigm that allows models to autonomously generate their own training tasks and learn by solving them in a self-play loop. This implementation provides three types of reasoning modes:

1. **Deduction**: Given a program and an input, predict the output
2. **Abduction**: Given a program and an output, infer an input that produces that output
3. **Induction**: Given input-output examples, infer the underlying pattern/function

The reasoner generates its own curriculum of increasingly complex tasks, solving them and improving through trial and error.

## Installation

This module is included in SmartGPT. No additional installation is required beyond making sure your environment has Python installed for code execution.

## Usage

### Basic Example

```javascript
import { absolute_zero_reasoner } from './src/tools/azr.js';

// Solve a deduction problem
const result = await absolute_zero_reasoner({
  query: `
def add_squares(a, b):
    return a*a + b*b

What is the output for input = (3, 4)?
  `,
  iterations: 3,  // Number of self-improvement iterations
  mode: 'deduction'  // 'deduction', 'abduction', or 'induction'
});

console.log(result.solution);  // The solution to the problem
console.log(result.confidence);  // Confidence score (0-1)
console.log(result.reasoning);  // Detailed reasoning process
```

### With SmartGPT

You can use AZR with a SmartGPT instance to leverage its reasoning capabilities:

```javascript
import { SmartGPT } from './src/index.js';
import { absolute_zero_reasoner } from './src/tools/azr.js';

// Create a SmartGPT instance
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  reasoningModel: "gpt-4o",
  contextModel: "gpt-4o"
});

const result = await absolute_zero_reasoner({
  query: "Find a pattern in this sequence: 1, 4, 9, 16, 25",
  iterations: 3,
  mode: 'induction'
}, smartGPT);

console.log(result.solution);
```

### Running the Test

A test script is included to demonstrate all three reasoning modes:

```bash
npm run test-azr
```

## Parameters

The `absolute_zero_reasoner` function takes the following parameters:

* `query` (string): The reasoning query to solve
* `iterations` (number, optional): Number of self-improvement iterations to run (default: 3)
* `mode` (string, optional): Reasoning mode - 'deduction', 'abduction', or 'induction' (default: inferred from query)

## How It Works

1. **Self-Play Loop**: The model proposes challenges for itself and attempts to solve them
2. **Verifiable Environment**: A Python code executor validates tasks and checks solutions
3. **Iterative Learning**: Through successive iterations, the model improves its reasoning abilities
4. **Curriculum Learning**: The model starts with simple problems and gradually increases complexity

## Security Considerations

The AZR implementation runs Python code in a sandboxed environment with a timeout to prevent malicious code execution. However, care should be taken when allowing user-provided inputs to be executed.

## License

This module is part of SmartGPT and is subject to the same license terms.
