import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { ChatGPTAPI } from "chatgpt";
import minimist from 'minimist';
import cliProgress from 'cli-progress';

dotenv.config();

export const main = async (prompt, numAsks, apiKey = process.env.API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-4") => {
    console.log("Starting script...");

    if (!apiKey) {
        throw new Error("API Key not found. Please check your .env file.");
    }

    const NUM_ASKS = Number(numAsks);
    
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(NUM_ASKS, 0);

    const api = new ChatGPTAPI({
        apiKey: apiKey,
        completionParams: {
            model: model,
            temperature: 1 
        },
    });

    let requests = [];
    for (let i = 0; i < NUM_ASKS; i++) {
        const message = `Question: ${prompt} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
        requests.push(api.sendMessage(message));
        progressBar.update(i + 1);
    }

    console.log("Requests sent, waiting for responses...");

    const responses = await Promise.allSettled(requests);
    progressBar.stop();

    console.log("Responses received, processing...");

    const resolvedResponses = responses.filter(r => r.status === 'fulfilled');

    const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
        return acc + `Answer Option ${idx+1}: ${currentResponse.value.text} \n\n`;
    }, `# Question: ${prompt} \n\n `) 
    + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

    const researcherResponse = await api.sendMessage(researcherPrompt);

    console.log("Researcher Response received, resolving...");

    const researcherId = researcherResponse.id;

    const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

    const resolverResponse = await api.sendMessage(resolverPrompt, {
        parentMessageId: researcherId,
    });

    console.log("Resolver Response received, compiling output...");

    const gptOutput = [
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

    const fileName = `${Date.now()}.txt`;
    const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
    
    const outputPath = path.join(outputDir, fileName);

    // Write output to a file
    try {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath,gptOutput);
        console.log(`Output was successfully saved to ${outputPath}`);
    } catch (err) {
        console.error("An error occurred while writing the output to a file: ", err);
    }

    console.log("Script completed successfully!");

    return {
        prompt: prompt,
        numAsks: NUM_ASKS,
        gptOutput: gptOutput
    };
};

