// Simple script to check if environment variables are loaded correctly
import * as dotenv from "dotenv";

// Load environment variables explicitly
dotenv.config();

console.log("Checking environment variables:");
console.log("----------------------------");
console.log(
  `ANTHROPIC_API_KEY: ${
    process.env.ANTHROPIC_API_KEY
      ? "✓ Set (length: " + process.env.ANTHROPIC_API_KEY.length + ")"
      : "✗ Missing"
  }`
);
console.log(
  `SERPER_API_KEY: ${
    process.env.SERPER_API_KEY
      ? "✓ Set (length: " + process.env.SERPER_API_KEY.length + ")"
      : "✗ Missing"
  }`
);
console.log("----------------------------");

// Check for issues
const issues = [];

if (issues.length > 0) {
  console.log("\nDetected issues:");
  issues.forEach((issue) => console.log(`- ${issue}`));
} else {
  console.log("\nNo issues detected with environment variables.");
}
