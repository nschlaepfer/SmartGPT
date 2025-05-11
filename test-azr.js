import "dotenv/config";
import { SmartGPT } from "./src/index.js";
import { absolute_zero_reasoner } from "./src/tools/azr.js";

// Create a SmartGPT instance
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  reasoningModel: "o4-mini", // Use a capable model for reasoning
  contextModel: "gpt-4.1",
  useNeo4j: false, // Disable Neo4j for simplicity
});

/**
 * Test different reasoning modes of the Absolute Zero Reasoner
 */
async function testAZR() {
  console.log("SmartGPT Absolute Zero Reasoner (AZR) Test");
  console.log("==========================================");

  try {
    // Example 1: Deduction task (predict output)
    console.log("\n--- Testing Deduction Mode ---");
    const deductionQuery = `
def calculate_sum_of_squares(n):
    result = 0
    for i in range(1, n+1):
        result += i * i
    return result

What is the output for input = 3?`;

    const deductionResult = await absolute_zero_reasoner(
      {
        query: deductionQuery,
        iterations: 2,
        mode: "deduction",
      },
      smartGPT
    );

    console.log("Query:", deductionQuery);
    console.log("Solution:", deductionResult.solution);
    console.log("Confidence:", deductionResult.confidence);
    console.log("Iterations performed:", deductionResult.iterations);
    // The reasoning output can be verbose, so let's not print it by default
    // console.log("Reasoning:", deductionResult.reasoning);

    // Example 2: Abduction task (find input for given output)
    console.log("\n--- Testing Abduction Mode ---");
    const abductionQuery = `
def multiply_and_add(x):
    return x * 2 + 5

What input would result in an output of 15?`;

    const abductionResult = await absolute_zero_reasoner(
      {
        query: abductionQuery,
        iterations: 2,
        mode: "abduction",
      },
      smartGPT
    );

    console.log("Query:", abductionQuery);
    console.log("Solution:", abductionResult.solution);
    console.log("Confidence:", abductionResult.confidence);
    console.log("Iterations performed:", abductionResult.iterations);

    // Example 3: Induction task (pattern finding)
    console.log("\n--- Testing Induction Mode ---");
    const inductionQuery = `Find the pattern and write a function that produces the following outputs:
Input: 1 -> Output: 1
Input: 2 -> Output: 4
Input: 3 -> Output: 9
Input: 4 -> Output: 16`;

    const inductionResult = await absolute_zero_reasoner(
      {
        query: inductionQuery,
        iterations: 2,
        mode: "induction",
      },
      smartGPT
    );

    console.log("Query:", inductionQuery);
    console.log("Solution:", inductionResult.solution);
    console.log("Confidence:", inductionResult.confidence);
    console.log("Iterations performed:", inductionResult.iterations);
  } catch (error) {
    console.error("Error testing AZR:", error);
  }
}

// Run the test
testAZR().catch(console.error);
