
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import minimist from 'minimist';
import cliProgress from 'cli-progress';
import { Configuration, OpenAIApi } from "openai";

dotenv.config();

// Define constants
const MAX_TOKENS = 15500; 
const TEMPERATURE = 1;
const MODEL = "gpt-3.5-turbo-16k";
const SYSTEM_MESSAGE = "You are a helpful assistant.";
const OUTPUT_FOLDER = 'Results';

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey,
}));

const createChatCompletion = async (model, messages) => {
    return openai.createChatCompletion({
        model: model,
        messages: messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
    });
};

const processResponses = (responses, NUM_ASKS) => {
    // Check for failed requests and print their reasons
    responses.forEach((response, i) => {
        if (response.status === 'rejected') {
            console.error(`Request ${i + 1} failed: ${response.reason}`);
        }
    });

    // Filter out failed requests 
    const resolvedResponses = responses.filter(r => r.status === 'fulfilled');

    if (resolvedResponses.length < NUM_ASKS) {
        console.error(`Only ${resolvedResponses.length} out of ${NUM_ASKS} requests were successful.`);
    }
    return resolvedResponses;
};

const writeToFile = async (data, fileName) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const filePath = path.join(OUTPUT_FOLDER, `${fileName.replace(/\s/g, '-').toLowerCase()}.txt`);
        await fs.writeFile(filePath, jsonString);
        console.log(`Data successfully written to ${filePath}`);
    } catch (error) {
        console.error(`Error writing to file: ${error}`);
    }
};

const printResponses = (responses) => {
    responses.forEach((response, i) => {
        if (response.status === 'fulfilled') {
            console.log(`Response ${i + 1}:`);
            console.log(response.value.data);
            console.log('\n');
        } else {
            console.log(`Request ${i + 1} failed: ${response.reason}`);
        }
    });
};

export const main = async (prompt, numAsks) => {
    console.log(`Using model: ${MODEL}`);
    console.log("Starting script...");

    const NUM_ASKS = Number(numAsks);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(NUM_ASKS, 0);

    let requests = [];
    for (let i = 0; i < NUM_ASKS; i++) {
        const message = `Question: ${prompt} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
        requests.push(createChatCompletion(MODEL, [
            { role: "system", content: SYSTEM_MESSAGE },
            { role: "user", content: message },
        ]));
        progressBar.update(i + 1);
    }
    
    console.log("Requests sent, waiting for responses...");
    const responses = await Promise.allSettled(requests);
    progressBar.stop();
    console.log("Responses received, printing...");
    printResponses(responses);
    console.log("Processing responses...");

    const resolvedResponses = processResponses(responses, NUM_ASKS);

    const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
        return acc + `Answer Option ${idx + 1}: ${currentResponse.value.data.choices[0].message.content}\n\n`;
    }, "");

    const researcherResponse = await createChatCompletion(MODEL, [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: researcherPrompt },
    ]);

    const resolverPrompt = resolvedResponses.reduce((acc, currentResponse) => {
        return acc + `Answer Option: ${currentResponse.value.data.choices[0].message.content}\n\n`;
    }, "");

    const resolverResponse = await createChatCompletion(MODEL, [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: resolverPrompt },
    ]);
    
    const finalAnswer = resolverResponse.data.choices[0].message.content;
    console.log(`Final Answer: ${finalAnswer}`);

    const result = {
        prompt: prompt,
        numAsks: NUM_ASKS,
        researcherResponse: researcherResponse.data.choices[0].message.content,
        resolverResponse: resolverResponse.data.choices[0].message.content,
        finalAnswer: finalAnswer
    };

    // Write the results to a file
    const fileName = prompt.split(' ').slice(0, 3).join(' ');
    await writeToFile(result, fileName);

    return result;
};