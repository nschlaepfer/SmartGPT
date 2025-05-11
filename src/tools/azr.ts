import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { SmartGPT } from "../core/smartGPT.js";
import { callStructured, rawCall } from "../models/llm.js";

// Promisify exec for async execution
const execPromise = promisify(exec);

// Code execution environment class for AZR
class CodeEnv {
  // Execute a Python function with given input
  async runProgram(
    programCode: string,
    inputVal: any
  ): Promise<[any, Error | null]> {
    // Create a temporary Python file for execution
    const tempFile = `/tmp/azr_${Date.now()}.py`;
    const fs = await import("fs/promises");

    try {
      // Write the program to a temporary file
      await fs.writeFile(tempFile, programCode);

      // Create a wrapper script that loads the function and runs it with input
      const wrapperCode = `
import json
import sys
from pathlib import Path

# Load the function
with open('${tempFile}') as f:
    exec(f.read())

# Find a function defined in the file
func = None
for name, obj in globals().items():
    if callable(obj) and name != 'func':
        func = obj
        break

if func is None:
    print("ERROR: No function defined", file=sys.stderr)
    sys.exit(1)

# Parse the input and call the function
try:
    input_val = json.loads('${JSON.stringify(inputVal)}')
    result = func(input_val)
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

      const wrapperFile = `${tempFile}_wrapper.py`;
      await fs.writeFile(wrapperFile, wrapperCode);

      // Execute with a timeout
      const { stdout, stderr } = await execPromise(`python3 ${wrapperFile}`, {
        timeout: 5000, // 5 second timeout for safety
      });

      // Clean up
      await fs.unlink(tempFile).catch(() => {});
      await fs.unlink(wrapperFile).catch(() => {});

      if (stderr) {
        return [null, new Error(stderr)];
      }

      // Parse the output
      try {
        return [JSON.parse(stdout), null];
      } catch (e) {
        return [stdout.trim(), null];
      }
    } catch (error) {
      // Clean up on error
      fs.unlink(tempFile).catch(() => {});
      return [null, error instanceof Error ? error : new Error(String(error))];
    }
  }

  // Verify a deduction task solution
  verifyDeduction(task: [string, any, any], solverOutput: string): number {
    const [_p, _i, trueO] = task;
    let proposedO;

    try {
      proposedO = JSON.parse(solverOutput);
    } catch {
      proposedO = solverOutput.trim();
    }

    return proposedO == trueO ? 1 : 0;
  }

  // Verify an abduction task solution
  async verifyAbduction(
    task: [string, any, any],
    solverOutput: string
  ): Promise<number> {
    const [p, _trueI, o] = task;
    let proposedI;

    try {
      proposedI = JSON.parse(solverOutput);
    } catch {
      proposedI = solverOutput.trim();
    }

    const [res, err] = await this.runProgram(p, proposedI);
    if (err) {
      return 0; // Bad input causes error
    }

    return res == o ? 1 : 0;
  }

  // Verify an induction task solution
  async verifyInduction(
    task: [string, Array<[any, any]>, string],
    solverOutput: string
  ): Promise<number> {
    const [_pTrue, examples, _m] = task;

    // Split examples into seen (half) vs unseen (half) for testing
    const exList = Array.from(examples);
    const half = Math.floor(exList.length / 2);
    const testExamples = half > 0 ? exList.slice(half) : exList;

    // Check if every test example passes with the solver's function
    try {
      for (const [inp, expectedOut] of testExamples) {
        const [out, err] = await this.runProgram(solverOutput, inp);
        if (err || out != expectedOut) {
          return 0;
        }
      }
      return 1;
    } catch (error) {
      return 0;
    }
  }
}

// Input and output types for the AZR tool
export const azrInput = z.object({
  query: z
    .string()
    .describe("The reasoning query to solve using Absolute Zero Reasoner"),
  iterations: z
    .number()
    .optional()
    .describe("Number of self-improvement iterations to run (default: 3)"),
  mode: z
    .enum(["deduction", "abduction", "induction"])
    .optional()
    .describe(
      "Reasoning mode: deduction (predict output), abduction (find input), induction (infer pattern)"
    ),
});

export const azrOutput = z.object({
  solution: z.string().describe("The solution to the reasoning query"),
  reasoning: z.string().describe("The step-by-step reasoning process"),
  confidence: z.number().describe("Confidence score (0-1)"),
  iterations: z.number().describe("Number of iterations performed"),
});

// The main AZR function
export async function absolute_zero_reasoner(
  params: z.infer<typeof azrInput>,
  smartGPT?: SmartGPT
): Promise<z.infer<typeof azrOutput>> {
  const { query, iterations = 3, mode = "deduction" } = params;
  const env = new CodeEnv();

  // Task buffers for each reasoning type
  const deductionBuffer: [string, any, any][] = [];
  const abductionBuffer: [string, any, any][] = [];
  const inductionBuffer: [string, Array<[any, any]>, string][] = [];

  // Track all programs for reuse
  const allPrograms: string[] = [];

  // Seed with a simple task if needed
  const seedP = "def identity(x):\n    return x";
  const seedI = 5;
  const [seedO, _] = await env.runProgram(seedP, seedI);

  if (seedO !== null) {
    deductionBuffer.push([seedP, seedI, seedO]);
    abductionBuffer.push([seedP, seedI, seedO]);
    allPrograms.push(seedP);
  }

  // Get the model to use (fallback to default if SmartGPT instance not available)
  // Since reasoningModel is private in SmartGPT, we'll rely on a default model
  const reasoningModel = process.env.DEFAULT_REASONING_MODEL || "gpt-4";

  // Keep track of the iterations and progress
  let currentIteration = 0;
  let bestSolution = "";
  let reasoning = "";
  let confidence = 0;

  // --- Proposal functions ---

  // Propose a deduction task
  async function proposeDeductionTask(): Promise<[string, any] | null> {
    const prompt = `Propose a new Python coding task.
Write a single Python function and provide an example input for it.
The function should be fairly simple but non-trivial.
Format:
\`\`\`
def function_name(...): ...
Input: <example_input>
\`\`\``;

    let text;
    if (smartGPT) {
      text = await smartGPT.ask(prompt);
    } else {
      text = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    // Parse the output
    const funcStart = text.indexOf("def ");
    if (funcStart === -1) return null;

    const inputIdx = text.indexOf("Input:", funcStart);
    if (inputIdx === -1) return null;

    const funcCode = text.substring(funcStart, inputIdx).trim();

    // Extract input after "Input:"
    const inputMatch = /Input:\s*([^\n]+)/.exec(text.substring(inputIdx));
    if (!inputMatch) return null;

    const rawInput = inputMatch[1].trim();
    let inputVal;

    try {
      // Try to parse input as JSON
      inputVal = JSON.parse(rawInput);
    } catch {
      // Otherwise use as string
      inputVal = rawInput;
    }

    return [funcCode, inputVal];
  }

  // Propose an abduction task
  async function proposeAbductionTask(): Promise<[string, any] | null> {
    const prompt = `Propose a coding puzzle.
Write a Python function and an example input that produces an interesting output.
Format:
\`\`\`
def function_name(...): ...
Input: <example_input>
\`\`\``;

    let text;
    if (smartGPT) {
      text = await smartGPT.ask(prompt);
    } else {
      text = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    // Parse similarly to deduction
    const funcStart = text.indexOf("def ");
    if (funcStart === -1) return null;

    const inputIdx = text.indexOf("Input:", funcStart);
    if (inputIdx === -1) return null;

    const funcCode = text.substring(funcStart, inputIdx).trim();

    const inputMatch = /Input:\s*([^\n]+)/.exec(text.substring(inputIdx));
    if (!inputMatch) return null;

    const rawInput = inputMatch[1].trim();
    let inputVal;

    try {
      inputVal = JSON.parse(rawInput);
    } catch {
      inputVal = rawInput;
    }

    return [funcCode, inputVal];
  }

  // Propose an induction task
  async function proposeInductionTask(): Promise<
    [string, Array<[any, any]>, string] | null
  > {
    if (!allPrograms.length) return null;

    // Pick a random program from existing ones
    const pCode = allPrograms[Math.floor(Math.random() * allPrograms.length)];

    // Generate examples using this program
    const N = 4;
    const inputs = Array.from({ length: N }, (_, i) => i + 1);
    const examples: Array<[any, any]> = [];

    for (const i of inputs) {
      const [out, err] = await env.runProgram(pCode, i);
      if (err) return null;
      examples.push([i, out]);
    }

    // Ask model to describe the pattern
    const examplesStr = examples.map(([i, o]) => `${i}->${o}`).join("; ");
    const prompt = `Given the following input-output pairs: ${examplesStr}
Describe in one sentence what the function does.`;

    let description;
    if (smartGPT) {
      description = await smartGPT.ask(prompt);
    } else {
      description = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    return [pCode, examples, description.trim()];
  }

  // --- Solver functions ---

  // Solve a deduction task
  async function solveDeductionTask(task: [string, any, any]): Promise<string> {
    const [pCode, i, _] = task;
    const prompt = `${pCode}\nInput: ${JSON.stringify(i)}\nOutput:`;

    let answer;
    if (smartGPT) {
      answer = await smartGPT.ask(prompt);
    } else {
      answer = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    if (answer.includes("Output:")) {
      answer = answer.split("Output:")[1];
    }

    return answer.trim();
  }

  // Solve an abduction task
  async function solveAbductionTask(task: [string, any, any]): Promise<string> {
    const [pCode, _, o] = task;
    const prompt = `${pCode}\nOutput: ${JSON.stringify(
      o
    )}\nWhat input would produce this output? Input:`;

    let answer;
    if (smartGPT) {
      answer = await smartGPT.ask(prompt);
    } else {
      answer = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    if (answer.includes("Input:")) {
      answer = answer.split("Input:")[1];
    }

    return answer.trim();
  }

  // Solve an induction task
  async function solveInductionTask(
    task: [string, Array<[any, any]>, string]
  ): Promise<string> {
    const [_, examples, m] = task;

    // Only give half the examples, keep rest for verification
    const exList = [...examples];
    const half = Math.floor(exList.length / 2);
    const seenExamples = half > 0 ? exList.slice(0, half) : exList;

    const promptLines = [];
    for (const [inp, out] of seenExamples) {
      promptLines.push(
        `Input: ${JSON.stringify(inp)} -> Output: ${JSON.stringify(out)}`
      );
    }

    if (m) {
      promptLines.push(`Description: ${m}`);
    }

    promptLines.push(
      "Write a Python function that produces these outputs for the given inputs:"
    );

    const prompt = promptLines.join("\n");

    let answer;
    if (smartGPT) {
      answer = await smartGPT.ask(prompt);
    } else {
      answer = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
      })) as string;
    }

    // Extract the code
    const funcStart = answer.indexOf("def ");
    if (funcStart !== -1) {
      let code = answer.substring(funcStart);

      // Handle if model included explanations after code
      const codeLines = [];
      for (const line of code.split("\n")) {
        if (line.trim().startsWith("#") || line.trim() === "") {
          continue;
        }
        codeLines.push(line);
      }

      return codeLines.join("\n");
    }

    return answer.trim();
  }

  // Main iteration loop
  for (let iter = 0; iter < iterations; iter++) {
    currentIteration = iter + 1;
    reasoning += `\n--- Iteration ${currentIteration} ---\n`;

    // --- PROPOSAL PHASE ---
    reasoning += "\nProposing tasks...\n";

    // Propose one task of each type
    const newDeductionTask = await proposeDeductionTask();
    if (newDeductionTask) {
      const [p, i] = newDeductionTask;
      const [o, err] = await env.runProgram(p, i);
      if (!err && o !== null) {
        deductionBuffer.push([p, i, o]);
        allPrograms.push(p);
        reasoning += `Generated deduction task: ${p.split("\n")[0]}...\n`;
      }
    }

    const newAbductionTask = await proposeAbductionTask();
    if (newAbductionTask) {
      const [p, i] = newAbductionTask;
      const [o, err] = await env.runProgram(p, i);
      if (!err && o !== null) {
        abductionBuffer.push([p, i, o]);
        allPrograms.push(p);
        reasoning += `Generated abduction task: ${p.split("\n")[0]}...\n`;
      }
    }

    const newInductionTask = await proposeInductionTask();
    if (newInductionTask) {
      inductionBuffer.push(newInductionTask);
      reasoning += "Generated induction task with examples\n";
    }

    // --- SOLVE PHASE ---
    reasoning += "\nSolving tasks...\n";

    // Solve based on the specified mode or query
    if (mode === "deduction" || query.toLowerCase().includes("output")) {
      // Solve the newest deduction task, or a random one
      if (deductionBuffer.length > 0) {
        const taskToSolve = deductionBuffer[deductionBuffer.length - 1];
        const solution = await solveDeductionTask(taskToSolve);
        const reward = env.verifyDeduction(taskToSolve, solution);

        reasoning += `Deduction task: "${taskToSolve[0].split("\n")[0]}..."\n`;
        reasoning += `Solution: ${solution}\n`;
        reasoning += `Correct: ${reward === 1 ? "Yes" : "No"}\n`;

        if (reward === 1) {
          confidence = Math.min(confidence + 0.2, 0.9);
          bestSolution = solution;
        }
      }
    }

    if (mode === "abduction" || query.toLowerCase().includes("input")) {
      // Solve the newest abduction task, or a random one
      if (abductionBuffer.length > 0) {
        const taskToSolve = abductionBuffer[abductionBuffer.length - 1];
        const solution = await solveAbductionTask(taskToSolve);
        const reward = await env.verifyAbduction(taskToSolve, solution);

        reasoning += `Abduction task: "${taskToSolve[0].split("\n")[0]}..."\n`;
        reasoning += `Solution: ${solution}\n`;
        reasoning += `Correct: ${reward === 1 ? "Yes" : "No"}\n`;

        if (reward === 1) {
          confidence = Math.min(confidence + 0.2, 0.9);
          bestSolution = solution;
        }
      }
    }

    if (mode === "induction" || query.toLowerCase().includes("pattern")) {
      // Solve the newest induction task, or a random one
      if (inductionBuffer.length > 0) {
        const taskToSolve = inductionBuffer[inductionBuffer.length - 1];
        const solution = await solveInductionTask(taskToSolve);
        const reward = await env.verifyInduction(taskToSolve, solution);

        reasoning += `Induction task: "Find pattern in ${taskToSolve[1].length} examples"\n`;
        reasoning += `Solution: ${solution.split("\n")[0]}...\n`;
        reasoning += `Correct: ${reward === 1 ? "Yes" : "No"}\n`;

        if (reward === 1) {
          confidence = Math.min(confidence + 0.2, 0.9);
          bestSolution = solution;
        }
      }
    }
  }

  // Now solve the actual query
  reasoning += "\n--- Solving User Query ---\n";

  // Determine if the query is a specific reasoning task
  let finalSolution;

  if (mode === "deduction" || query.toLowerCase().includes("output")) {
    // If query contains a Python function and input, extract and solve
    const funcMatch = /def\s+\w+\s*\(.*?\).*?:/s.exec(query);
    const inputMatch = /input.*?[:=]\s*(.+?)(?:\n|$)/i.exec(query);

    if (funcMatch && inputMatch) {
      const funcCode =
        funcMatch[0] +
        query
          .substring(funcMatch.index + funcMatch[0].length)
          .split(/\n\s*\n/)[0];
      let inputVal;

      try {
        inputVal = JSON.parse(inputMatch[1].trim());
      } catch {
        inputVal = inputMatch[1].trim();
      }

      // Run the function to get output
      const [output, err] = await env.runProgram(funcCode, inputVal);
      if (!err && output !== null) {
        finalSolution = String(output);
        confidence = 0.95;
        reasoning += `Direct execution result: ${finalSolution}\n`;
      }
    }
  }

  // If direct execution wasn't possible, ask the model to solve based on learned patterns
  if (!finalSolution) {
    const contextExamples = [];

    // Add examples from the appropriate buffer based on mode
    if (mode === "deduction") {
      contextExamples.push(
        ...deductionBuffer
          .slice(-3)
          .map(
            ([p, i, o]) =>
              `Example:\n${p}\nInput: ${JSON.stringify(
                i
              )}\nOutput: ${JSON.stringify(o)}`
          )
      );
    } else if (mode === "abduction") {
      contextExamples.push(
        ...abductionBuffer
          .slice(-3)
          .map(
            ([p, _, o]) =>
              `Example:\n${p}\nOutput: ${JSON.stringify(o)}\nInput: ...`
          )
      );
    } else if (mode === "induction") {
      contextExamples.push(
        ...inductionBuffer
          .slice(-2)
          .map(
            ([_, examples, desc]) =>
              `Example: "${desc}"\nPatterns: ${examples
                .map(([i, o]) => `${i}->${o}`)
                .join(", ")}`
          )
      );
    }

    // Craft the final prompt with context from training
    const finalPrompt = `
I've been practicing solving ${mode} reasoning tasks. Here are some examples I've worked with:

${contextExamples.join("\n\n")}

Now, please solve this specific problem:
${query}

Provide a detailed solution with step-by-step reasoning.`;

    if (smartGPT) {
      finalSolution = await smartGPT.ask(finalPrompt);
    } else {
      finalSolution = (await rawCall({
        model: reasoningModel,
        messages: [{ role: "user", content: finalPrompt }],
      })) as string;
    }

    confidence = Math.max(confidence, 0.7); // Minimum confidence for a direct solution
  }

  // If no solution was found from either method, provide a message
  if (!finalSolution && bestSolution) {
    finalSolution = bestSolution;
  } else if (!finalSolution) {
    finalSolution =
      "Could not generate a solution after training. Please try increasing the number of iterations or providing a clearer problem statement.";
    confidence = 0.3;
  }

  return {
    solution: finalSolution,
    reasoning,
    confidence,
    iterations: currentIteration,
  };
}
