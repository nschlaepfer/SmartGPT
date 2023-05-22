import express from 'express';
import { main } from './TreeOfThought.js'; // replace with your script file name

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public')); //to use css



app.get('/', (req, res) => {
    res.render('index');
});

app.post('/generate', express.urlencoded({ extended: true }), async (req, res) => {
    const { prompt, numAsks } = req.body;
    const output = await main(prompt, numAsks);
    res.render('result', { output });
});

app.listen(3000, () => console.log('Server started on port 3000'));

