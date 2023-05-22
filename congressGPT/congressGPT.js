
//UNTESTED code below

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { ChatGPTAPI } from "chatgpt";
import minimist from 'minimist';
import cliProgress from 'cli-progress';

dotenv.config();

/**
 * Main function that runs the congressGPT feature
 * @param {string} prompt - The user's prompt
 * @param {number} numAsks - The number of response options to generate
 * @param {string} [apiKey] - The API key for ChatGPTAPI (optional)
 * @param {string} [model] - The model name for ChatGPTAPI (optional)
 * @returns {object} An object with the prompt, numAsks, and gptOutput properties
 */
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

    // Investigate/Research
    const researchOutput = await research(api, prompt, NUM_ASKS, progressBar);

    // Plan/Organize
    const planOutput = await plan(api, researchOutput);

    // Build/Execute
    const buildOutput = await build(api, planOutput);

    // Refine/Improve
    const refineOutput = await refine(api, buildOutput);

    // Deliver/Future Plan
    const deliverOutput = await deliver(api, refineOutput);

    progressBar.stop();

    console.log("Script completed successfully!");

    return deliverOutput;
};

// Add your implementation for each stage of the thought process here

/**
 * Research stage: Sends the user's prompt to ChatGPTAPI and gets NUM_ASKS response options
 * @param {ChatGPTAPI} api - The ChatGPTAPI instance
 * @param {string} prompt - The user's prompt
 * @param {number} NUM_ASKS - The number of response options to generate
 * @param {cliProgress.SingleBar} progressBar - The progress bar instance
 * @returns {Promise[]} An array of promises that resolve to the response options
 */
async function research(api, prompt, NUM_ASKS, progressBar) {
    let requests = [];
    for (let i = 0; i < NUM_ASKS; i++) {
        const message = `Question: ${prompt} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
        requests.push(api.sendMessage(message));
        progressBar.update(i + 1);
    }

    console.log("Requests sent, waiting for responses...");

    const responses = await Promise.allSettled(requests);

    console.log("Responses received, processing...");

    const resolvedResponses = responses.filter(r => r.status === 'fulfilled');

    return resolvedResponses;

    /**
     * Plan stage: Evaluates the response options and lists the flaws and faulty logic of each one
     * @param {ChatGPTAPI} api - The ChatGPTAPI instance
     * @param {Promise[]} researchOutput - The array of promises that resolve to the response options
     * @returns {Promise} A promise that resolves to the researcher's response
     */
    async function plan(api, researchOutput) {
        const researcherPrompt = researchOutput.reduce((acc, currentResponse, idx) => {
            return acc + `Answer Option ${idx + 1}: ${currentResponse.value.text} \n\n`;
        }, `# Question: ${prompt} \n\n `)
            + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

        const researcherResponse = await api.sendMessage(researcherPrompt);

        console.log("Researcher Response received, resolving...");

        return researcherResponse;
    }

    /**
     * Build stage: Finds the best answer option and creates a plan to execute it
     * @param {ChatGPTAPI} api - The ChatGPTAPI instance
     * @param {Promise} planOutput - The promise that resolves to the researcher's response
     * @returns {Promise} A promise that resolves to the builder's response
     */
    async function build(api, planOutput) {
        const researcherId = planOutput.id;

        const builderPrompt = `You are a builder tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) creating a plan to execute that answer, and 3) Printing the execution plan in full. Let's work this out in a step by step way to be sure we have the right answer:`;

        const builderResponse = await api.sendMessage(builderPrompt, {
            parentMessageId: researcherId,
        });

        console.log("Builder Response received, refining...");

        return builderResponse;
    }

    /**
     * Refine stage: Reviews the execution plan and suggests improvements to it
     * @param {ChatGPTAPI} api - The ChatGPTAPI instance
     * @param {Promise} buildOutput - The promise that resolves to the builder's response
     * @returns {Promise} A promise that resolves to the refiner's response
     */
    async function refine(api, buildOutput) {
        const builderId = buildOutput.id;

        const refinerPrompt = `You are a refiner tasked with 1) reviewing the execution plan 2) suggesting improvements to the plan, and 3) Printing the refined plan in full. Let's work this out in a step by step way to be sure we have the right answer:`;

        const refinerResponse = await api.sendMessage(refinerPrompt, {
            parentMessageId: builderId,
        });

        console.log("Refiner Response received, delivering...");

        return refinerResponse;
    }

    /**
     * Deliver stage: Executes the refined plan and prints the final output in full
     * @param {ChatGPTAPI} api - The ChatGPTAPI instance
     * @param {Promise} refineOutput - The promise that resolves to the refiner's response
     * @returns {object} An object with the prompt, numAsks, and gptOutput properties
     */
    async function deliver(api, refineOutput) {
        const refinerId = refineOutput.id;

        const delivererPrompt = `You are a deliverer tasked with 1) reviewing the refined plan 2) executing the plan, and 3) Printing the final output in full. Let's work this out in a step by step way to be sure we have the right answer:`;

        const delivererResponse = await api.sendMessage(delivererPrompt, {
            parentMessageId: refinerId,
        });

        console.log("Deliverer Response received, compiling output...");

        const gptOutput = [
            "# Prompt",
            "", prompt, "",
            "# Researcher Prompt",
            "", researcherPrompt, "",
            "# Researcher Response",
            "", researcherResponse.text, "",
            "# Builder Prompt",
            "", builderPrompt, "",
            "# Builder Response",
            "", builderResponse.text, "",
            "# Refiner Prompt",
            "", refinerPrompt, "",
            "# Refiner Response",
            "", refinerResponse.text, "",
            "# Deliverer Prompt",
            "", delivererPrompt, "",
            "# Deliverer Response",
            "", delivererResponse.text, ""
        ].join("\n\n");

        const fileName = `${Date.now()}.txt`;
        const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');

        const outputPath = path.join(outputDir, fileName);

        // Write output to a file
        try {
            await fs.mkdir(outputDir, { recursive: true });
            await fs.writeFile(outputPath, gptOutput);
            console.log(`Output was successfully saved to ${outputPath}`);
        } catch (err) {
            console.error("An error occurred while writing the output to a file: ", err);
        }

        return {
            prompt: prompt,
            numAsks: NUM_ASKS,
            gptOutput: gptOutput
        };
    }
}

