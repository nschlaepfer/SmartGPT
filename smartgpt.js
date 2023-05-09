import dotenv from 'dotenv';
import { ChatGPTAPI } from "chatgpt";
import minimist from 'minimist';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
dotenv.config();

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("API Key not found. Please check your .env file.");
    process.exit(1);
}

const argv = minimist(process.argv.slice(2));

const model = argv.model || "gpt-4";
const NUM_ASKS = argv.numAsks || 3;

const TOTAL_STEPS = NUM_ASKS + 2; // Steps for initial requests, researcher, and resolver

class ProgressBar {
    constructor(totalSteps) {
        this.totalSteps = totalSteps;
        this.currentStep = 0;
        this.wordCount = 0;
    }

    increment() {
        this.currentStep++;
    }

    countWords(message) {
        const wordCount = message.split(/\s+/).length;
        this.wordCount += wordCount;
    }

    render() {
        const length = 20;
        const progress = Math.floor((this.currentStep / this.totalSteps) * length);
        const remaining = length - progress;

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`Progress: [${'='.repeat(progress)}${' '.repeat(remaining)}] ${Math.round((this.currentStep / this.totalSteps) * 100)}%`);
    }
}

const progressBar = new ProgressBar(TOTAL_STEPS);

const main = async () => {
    try {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question("Please enter a prompt: ", async (prompt) => {
            rl.question("Please enter the number of asks: ", async (numAsks) => {
            rl.close();

            const NUM_ASKS = Number(numAsks);
                const TOTAL_STEPS = NUM_ASKS + 2;
                const progressBar = new ProgressBar(TOTAL_STEPS);

            const filenamePrefix = prompt.split(' ').slice(0, 5).join('_');

            const api = new ChatGPTAPI({
                apiKey: apiKey,
                completionParams: {
                    model: model,
                },
            });

            let requests = [];
            for (let i = 0; i < NUM_ASKS; i++) {
                const message = `Question: ${prompt} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
                requests.push(api.sendMessage(message));
                progressBar.increment();
                progressBar.countWords(message); // Count the words in the message
                progressBar.render();
            }
            

            const responses = await Promise.all(requests);

            const researcherPrompt = responses.reduce((acc, currentResponse, idx) => {
                return acc + `Answer Option ${idx+1}: ${currentResponse.text} \n\n`;
            }, `# Question: ${prompt} \n\n `) 
            + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

            const researcherResponse = await api.sendMessage(researcherPrompt);
            progressBar.increment();
            progressBar.render();

            const researcherId = researcherResponse.id;

            const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

            const resolverResponse = await api.sendMessage(resolverPrompt, {
                parentMessageId: researcherId,
            });
            progressBar.increment();
            progressBar.render();

            const timestamp = Date.now();
            const outputDir = './output';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }
            const filename = path.join(outputDir, `${filenamePrefix}_${timestamp}.txt`);

            const data = [
            "# Prompt",
            "", prompt, "",
            "# Researcher Prompt",
            "", researcherPrompt, "",
            "# Researcher Response",
            "", researcherResponse.text, "",
            "# Resolver Prompt",
            "", resolverPrompt, "",
            "# Resolver Response",
            "", resolverResponse.text, ""
            ].join("\n\n");
            fs.writeFileSync(filename, data);        console.log(`\nWrote output to ${filename}`);
        });
        });
    
    } catch (error) {
        console.error(error);
    }
};

main();
