import express from 'express';
import { main } from './TreeOfThought.js';
import { logFilePath } from './TreeOfThought.js';
import * as marked from 'marked';


const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/generate', express.urlencoded({ extended: true }), async (req, res) => {
    const prompt = req.body.prompt;
    const numAsks = req.body.numAsks;
    try {
        const output = await main(prompt, numAsks);
        console.log("OUTPUT: ", output);  // Print the output
        const markdownOutput = marked(JSON.stringify(output, null, 2));
        res.render('result', { output: markdownOutput });
    }catch (error) {
            console.error(error); // Logs the actual error to the console
            res.status(500).send("An error occurred while generating the output. Error: " + error.message);
        }
        
});



app.listen(3000, () => {
    console.log(`Server started on port 3000, Link: http://localhost:3000/\nLog file path: ${logFilePath}`);
});
