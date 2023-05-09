import express from 'express';
import bodyParser from 'body-parser';
import { main } from './smartgpt.js';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const port = 3000;

// Add this line before your routes
app.use(express.static('public')); // or wherever your static files are located

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/run', async (req, res) => {
  try {
    const { prompt, numAsks } = req.body;

    // Input validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).send("Invalid 'prompt' value");
    }
    if (!numAsks || isNaN(numAsks) || Number(numAsks) <= 0) {
      return res.status(400).send("Invalid 'numAsks' value");
    }

    const result = await main(prompt, numAsks);
    const fileName = `${Date.now()}.txt`;
    const outputDir = path.join(__dirname, 'output');
    const outputPath = path.join(outputDir, fileName);

    // Write output to a file
    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outputPath, result.gptOutput);
      console.log(`Output was successfully saved to ${outputPath}`);
    } catch (err) {
      console.error("An error occurred while writing the output to a file: ", err);
    }

    res.render('output', { output: result });
  } catch (err) {
    res.status(500).send("An error occurred: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
