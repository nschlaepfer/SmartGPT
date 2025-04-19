// Simple script to check if environment variables are loaded correctly
import * as dotenv from "dotenv";

// Load environment variables explicitly
dotenv.config();

console.log("Checking environment variables:");
console.log("----------------------------");
console.log(
  `OPENAI_API_KEY: ${
    process.env.OPENAI_API_KEY
      ? "✓ Set (length: " + process.env.OPENAI_API_KEY.length + ")"
      : "✗ Missing"
  }`
);
console.log(
  `ANTHROPIC_API_KEY: ${
    process.env.ANTHROPIC_API_KEY
      ? "✓ Set (length: " + process.env.ANTHROPIC_API_KEY.length + ")"
      : "✗ Missing"
  }`
);
console.log(
  `GOOGLE_GENERATIVE_AI_API_KEY: ${
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "✓ Set (length: " +
        process.env.GOOGLE_GENERATIVE_AI_API_KEY.length +
        ")"
      : "✗ Missing"
  }`
);
console.log(
  `GROQ_API_KEY: ${
    process.env.GROQ_API_KEY
      ? "✓ Set (length: " + process.env.GROQ_API_KEY.length + ")"
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
if (!process.env.OPENAI_API_KEY) {
  issues.push("OPENAI_API_KEY is missing");
}

// Show API keys with potential issues
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.includes('"')) {
  issues.push(
    "OPENAI_API_KEY contains quotes which might cause issues - remove the quotes in the .env file"
  );
  console.log(`OPENAI_API_KEY value: ${process.env.OPENAI_API_KEY}`);
}

if (issues.length > 0) {
  console.log("\nDetected issues:");
  issues.forEach((issue) => console.log(`- ${issue}`));
} else {
  console.log("\nNo issues detected with environment variables.");
}
