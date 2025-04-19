/**
 * Test script for the macOS shell tool
 * Demonstrates how the shell tool works with various commands
 */
import { macos_shell } from "../src/tools/index.js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define test commands
const commands = [
  {
    name: "Directory Listing",
    cmd: "ls -la",
    description: "List all files in the current directory with details",
  },
  {
    name: "System Information",
    cmd: "uname -a",
    description: "Display system information including kernel version",
  },
  {
    name: "Process List",
    cmd: "ps aux | head -5",
    description: "Show the first 5 running processes",
  },
  {
    name: "Write to Current Directory",
    cmd: "echo 'This is a test file' > test_file.txt && cat test_file.txt && rm test_file.txt",
    description: "Create a test file, display its contents, then delete it",
  },
  {
    name: "Environment Variables",
    cmd: "echo PATH=$PATH | head -c 50",
    description:
      "Show the first 50 characters of the PATH environment variable",
  },
  {
    name: "Error Command",
    cmd: "command_that_does_not_exist",
    description: "Test error handling with a non-existent command",
  },
];

// Run all test commands
async function runTests() {
  console.log("🧪 Testing macOS Shell Tool\n");
  console.log("This test will demonstrate the shell tool's functionality.");
  console.log("Note: The tool will attempt to use sandbox mode first.");
  console.log(
    "If that fails due to permissions, it will fall back to regular execution.\n"
  );

  for (const test of commands) {
    console.log(`\n🔶 Test: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`Command: ${test.cmd}`);
    console.log("───────────────────────────────────────");

    try {
      const start = Date.now();
      const result = await macos_shell({ command: test.cmd });
      const duration = Date.now() - start;

      console.log(`Exit Code: ${result.exitCode}`);

      if (result.stdout) {
        console.log("Standard Output:");
        console.log(result.stdout);
      }

      if (result.stderr) {
        console.log("Standard Error:");
        console.log(result.stderr);
      }

      console.log(`⏱️ Completed in ${duration}ms`);
    } catch (error) {
      console.error("Error running command:", error);
    }
  }

  console.log("\n✅ Test complete.");
}

// Run the tests
runTests().catch(console.error);
