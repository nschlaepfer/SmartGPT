import express from "express";

// Initialize Express app
const app = express();

// Root endpoint
app.get("/", (req, res) => {
  res.send("Test server running");
});

// Start server
const port = 3000;
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});

console.log("Server initialized and listening");
