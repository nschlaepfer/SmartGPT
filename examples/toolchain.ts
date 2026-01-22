/**
 * Example of using SmartGPT's toolchain for sandbox execution and dual-model AI integration
 */
import { SmartGPT } from "../src/index.js";
import {
  macos_shell,
  read_json,
  codex_sdk,
} from "../src/tools/index.js";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Ensure API keys are loaded and print verification
console.log("Environment variables loaded:");
console.log(`- Codex login: use Codex CLI/IDE auth`);
console.log(
  `- ANTHROPIC_API_KEY: ${
    process.env.ANTHROPIC_API_KEY ? "✓ Present" : "✗ Missing"
  }`
);
console.log(
  `- SERPER_API_KEY: ${process.env.SERPER_API_KEY ? "✓ Present" : "✗ Missing"}`
);

const smartGPT = new SmartGPT({
  agentProvider: "codex",
  reasoningModel: "gpt-5-mini-codex",
  contextModel: "gpt-5-codex",
  deep: true,
  serperApiKey: process.env.SERPER_API_KEY,
});

// Example function showing the usage of various tools
async function runToolchainExample() {
  console.log("🧠 SmartGPT Toolchain Example\n");

  // 1. Run a sandboxed shell command (restricted to no network, limited file access)
  console.log("📦 Running command in a macOS sandbox...");
  try {
    const sandboxResult = await macos_shell({ command: "ls -la" });
    console.log(`🖥️  Exit code: ${sandboxResult.exitCode}`);
    console.log(`📄 Output:\n${sandboxResult.stdout}`);
    if (sandboxResult.stderr) {
      console.log(`❌ Error:\n${sandboxResult.stderr}`);
    }
  } catch (error) {
    console.error(
      `❌ Sandbox error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // 2. Create a test JSON file
  const testDataPath = path.join(process.cwd(), "test_data.json");
  const testData = {
    name: "SmartGPT",
    features: ["Dual-Model Pipeline", "Advanced Reasoning", "Tool Integration"],
    models: {
      reasoning: "gpt-5-mini-codex",
      context: "gpt-5-codex",
    },
  };
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));

  // 3. Read the created JSON file using the tool
  console.log("\n📦 Reading a JSON file...");
  try {
    const jsonResult = await read_json({ filePath: testDataPath });
    console.log("📄 JSON data:", jsonResult.data);
  } catch (error) {
    console.error(
      `❌ JSON reading error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // 4. Use Codex to analyze the JSON data
  console.log("\n🧠 Using Codex to analyze data...");
  try {
    const prompt = `Analyze this JSON data and explain its structure and purpose:\n${JSON.stringify(
      testData,
      null,
      2
    )}`;
    const codexResult = await codex_sdk({ prompt });
    console.log(`📄 Codex analysis:\n${codexResult.completion}`);
  } catch (error) {
    console.error(
      `❌ Codex error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // 5. Demonstrate dual-model thought chain
  console.log("\n🔄 Running a dual-model thought chain...");
  try {
    const result = await smartGPT.thoughtChain(
      "Explain how the macOS sandbox-exec works and why it's useful for secure toolchains",
      2 // number of drafts
    );
    console.log(`📄 Best answer from thoughtChain:\n${result.best}`);
  } catch (error) {
    console.error(
      `❌ ThoughtChain error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Clean up
  try {
    fs.unlinkSync(testDataPath);
  } catch (error) {
    console.error(
      `❌ Cleanup error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Run the example
runToolchainExample().catch((error) => {
  console.error("❌ Example failed:", error);
});
