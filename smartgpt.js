// smartgpt.js

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from "openai";
import minimist from 'minimist';
import cliProgress from 'cli-progress';

dotenv.config();

export const main = async (prompt, numAsks, apiKey = process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-3.5-turbo-16k") => {
    console.log("Starting script...");

    if (!apiKey) {
        throw new Error("API Key not found. Please check your .env file.");
    }

    const NUM_ASKS = Number(numAsks); // Standard is 3. User defined.

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(NUM_ASKS, 0);

    const configuration = new Configuration({
        apiKey: apiKey,
    });

    const openai = new OpenAIApi(configuration);

    let maxTokens;
    if (model === "gpt-4") {
        maxTokens = 6000;
    } else if (model === "gpt-3.5-turbo-16k") {
        maxTokens = 14000;
    } else if (model === "gpt-3.5-turbo") {
        maxTokens = 2048;
    } else {
        throw new Error("Invalid model specified.");
    }

    //experimental system prompt. 
    const customSystemPrompt = "You are an autoregressive language model that has been fine-tuned with instruction-tuning and RLHF. You carefully provide accurate, factual, thoughtful, nuanced answers, and are brilliant at reasoning. If you think there might not be a correct answer, you say so. Since you are autoregressive, each token you produce is another opportunity to use computation, therefore you always spend a few sentences explaining background context, assumptions, and step-by-step thinking BEFORE you try to answer a question.";

    // ASK PHASE *****************
    let requests = [];
    for (let i = 0; i < NUM_ASKS; i++) {
        const messages = [
            { role: "system", content: customSystemPrompt },
            { role: "user", content: prompt },
            { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer. Be creative and unique." }
        ];
        requests.push(openai.createChatCompletion({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            n: 1,
            stop: null,
            temperature: 1,
        }));
        progressBar.update(i + 1);
    }
    console.log("Requests sent, waiting for responses...");

    const responses = await Promise.allSettled(requests);
    progressBar.stop();

    // Logging rejected promises
    responses.forEach((response, index) => {
        if(response.status === 'rejected') {
            console.error(`Request ${index} failed: ${response.reason}`);
        }
    });

    const resolvedResponses = responses.filter(r => r.status === 'fulfilled').map(r => r.value.data.choices[0].message.content);
    const initialGptAnswers = resolvedResponses.join('\n\n');

    // RESEARCHER PHASE *****************
    const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
        return acc + `Answer Option ${idx+1}: ${currentResponse} \n\n`;
    }, `You are a researcher tasked with investigating the ${NUM_ASKS} response option(s) provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`);

    const researcherResponse = await openai.createChatCompletion({
        model: model,
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: researcherPrompt },
            { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer." }
        ],
        max_tokens: maxTokens,
        n: 1,
        stop: null,
        temperature: 0.5,
    });

    console.log("Researcher Response received, resolving...");

    // RESOLVER PHASE *****************
    const resolverPrompt = `You are a resolver tasked with finding which of the ${NUM_ASKS} answer options the researcher thought was best then improving that answer. Here is the information you need to use to create the best answer:
    Researcher's findings: ${researcherResponse.data.choices[0].message.content}
    Original Prompt: ${prompt}
    Answer Options: ${resolvedResponses.join(', ')} `;

    const resolverResponse = await openai.createChatCompletion({
        model: model,
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: resolverPrompt },
            { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer." }
        ],
        max_tokens: maxTokens,
        n: 1,
        stop: null,
        temperature: 0.3,
    });

    console.log("Resolver Response received, compiling output...");

    const finalAnswer = resolverResponse.data.choices[0].message.content;

    const gptOutput = [
        "# Prompt",
        "", prompt, "",
        "# Initial GPT Answers",
        "", initialGptAnswers, "",
        "# Researcher Prompt",
        "", researcherPrompt, "",
        "# Researcher Response",
        "", researcherResponse.data.choices[0].message.content, "",
        "# Resolver Prompt",
        "", resolverPrompt, "",
        "# Resolver Response",
        "", resolverResponse.data.choices[0].message.content, "",
        "# Final Revised Answer",
        "", finalAnswer
    ].join("\n\n");

    const fileName = `${Date.now()}.txt`;
    const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
    const outputPath = path.join(outputDir, fileName);

    try {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, gptOutput);
        console.log(`Output was successfully saved to ${outputPath}`);
    } catch (err) {
        console.error("An error occurred while writing the output to a file: ", err);
    }

    console.log("Script completed successfully!");

    const outputURL = `/output/${fileName}`;

    return {
        prompt: prompt,
        numAsks: NUM_ASKS,
        researcherResponse: researcherResponse.data.choices[0].message.content,
        resolverResponse: resolverResponse.data.choices[0].message.content,
        finalAnswer: finalAnswer,
        outputURL: outputURL
    };
};


// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { Configuration, OpenAIApi } from "openai";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// const ROLE_SYSTEM = "system";
// const ROLE_USER = "user";
// const MODEL = "gpt-3.5-turbo-16k";
// const MAX_TOKENS = 14000;
// const N = 1;
// const TEMPERATURE = 1;

// const makeRequest = async (openai, systemPrompt, userPrompt = '') => {
//     return openai.createChatCompletion({
//         model: MODEL,
//         messages: [
//             { role: ROLE_SYSTEM, content: systemPrompt },
//             { role: ROLE_USER, content: userPrompt }
//         ],
//         max_tokens: MAX_TOKENS,
//         n: N,
//         stop: null,
//         temperature: TEMPERATURE,
//     });
// };

// const writeToFile = async (fileName, content) => {
//     const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
//     const outputPath = path.join(outputDir, fileName);

//     try {
//         await fs.mkdir(outputDir, { recursive: true });
//         await fs.writeFile(outputPath, content);
//         console.log(`Output was successfully saved to ${outputPath}`);
//     } catch (err) {
//         console.error("An error occurred while writing the output to a file: ", err);
//     }
// };

// export const main = async (prompt, numAsks, apiKey = process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey) => {
//     console.log("Starting script...");

//     if (!apiKey) {
//         throw new Error("API Key not found. Please check your .env file.");
//     }

//     const NUM_ASKS = Number(numAsks);

//     const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
//     progressBar.start(NUM_ASKS, 0);

//     const configuration = new Configuration({ apiKey });
//     const openai = new OpenAIApi(configuration);

//     let resolvedResponses = [];

//     for (let i = 0; i < NUM_ASKS; i++) {
//         const response = await makeRequest(openai, "You are a helpful assistant.", prompt);
//         progressBar.update(i + 1);
//         resolvedResponses.push(response);
//     }

//     progressBar.stop();
//     console.log("Responses received, processing...");

//     const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
//         return acc + `Answer Option ${idx+1}: ${currentResponse.value.data.choices[0].message.content} \n\n`;
//     }, `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`);

//     const researcherResponse = await makeRequest(openai, researcherPrompt);

//     console.log("Researcher Response received, resolving...");

//     const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

//     const resolverResponse = await makeRequest(openai, resolverPrompt);

//     console.log("Resolver Response received, compiling output...");

//     const gptOutput = [
//         "# Prompt",
//         "", prompt, "",
//         "# Researcher Prompt",
//         "", researcherPrompt, "",
//         "# Researcher Response",
//         "", researcherResponse.data.choices[0].message.content, "",
//         "# Resolver Prompt",
//         "", resolverPrompt, "",
//         "# Resolver Response",
//         "", resolverResponse.data.choices[0].message.content, ""
//     ].join("\n\n");

//     const fileName = `${Date.now()}.txt`;

//     await writeToFile(fileName, gptOutput);

//     console.log("Script completed successfully!");

//     const outputURL = `/output/${fileName}`;

//     return {
//         prompt: prompt,
//         numAsks: NUM_ASKS,
//         researcherResponse: researcherResponse.data.choices[0].message.content,
//         resolverResponse: resolverResponse.data.choices[0].message.content,
//         outputURL: outputURL
//     };
// };



// refine temp _ working 
// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { Configuration, OpenAIApi } from "openai";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// const ROLE_SYSTEM = "system";
// const ROLE_USER = "user";
// const ROLE_ASSISTANT = "assistant";
// const MODEL = "gpt-3.5-turbo-16k";
// const MAX_TOKENS = 14000;
// const N = 1;
// const TEMPERATURE = 1;

// const makeRequest = async (openai, prompt) => {
//     return openai.createChatCompletion({
//         model: MODEL,
//         messages: [
//             { role: ROLE_SYSTEM, content: "You are a helpful assistant." },
//             { role: ROLE_USER, content: prompt },
//             { role: ROLE_ASSISTANT, content: "Let's work this out in a step by step way to be sure we have the right answer." }
//         ],
//         max_tokens: MAX_TOKENS,
//         n: N,
//         stop: null,
//         temperature: TEMPERATURE,
//     });
// };

// const writeToFile = async (fileName, content) => {
//     const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
//     const outputPath = path.join(outputDir, fileName);

//     try {
//         await fs.mkdir(outputDir, { recursive: true });
//         await fs.writeFile(outputPath, content);
//         console.log(`Output was successfully saved to ${outputPath}`);
//     } catch (err) {
//         console.error("An error occurred while writing the output to a file: ", err);
//     }
// };

// export const main = async (prompt, numAsks, apiKey = process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey) => {
//     console.log("Starting script...");

//     if (!apiKey) {
//         throw new Error("API Key not found. Please check your .env file.");
//     }

//     const NUM_ASKS = Number(numAsks);

//     const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
//     progressBar.start(NUM_ASKS, 0);

//     const configuration = new Configuration({ apiKey });
//     const openai = new OpenAIApi(configuration);

//     let resolvedResponses = [];

//     for (let i = 0; i < NUM_ASKS; i++) {
//         const response = await makeRequest(openai, prompt);
//         progressBar.update(i + 1);
//         resolvedResponses.push(response);
//     }

//     progressBar.stop();
//     console.log("Responses received, processing...");

//     const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
//         return acc + `Answer Option ${idx+1}: ${currentResponse.value.data.choices[0].message.content} \n\n`;
//     }, `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`);

//     const researcherResponse = await makeRequest(openai, researcherPrompt);

//     console.log("Researcher Response received, resolving...");

//     const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

//     const resolverResponse = await makeRequest(openai, resolverPrompt);

//     console.log("Resolver Response received, compiling output...");

//     const gptOutput = [
//         "# Prompt",
//         "", prompt, "",
//         "# Researcher Prompt",
//         "", researcherPrompt, "",
//         "# Researcher Response",
//         "", researcherResponse.data.choices[0].message.content, "",
//         "# Resolver Prompt",
//         "", resolverPrompt, "",
//         "# Resolver Response",
//         "", resolverResponse.data.choices[0].message.content, ""
//     ].join("\n\n");

//     const fileName = `${Date.now()}.txt`;

//     await writeToFile(fileName, gptOutput);

//     console.log("Script completed successfully!");

//     const outputURL = `/output/${fileName}`;

//     return {
//         prompt: prompt,
//         numAsks: NUM_ASKS,
//         researcherResponse: researcherResponse.data.choices[0].message.content,
//         resolverResponse: resolverResponse.data.choices[0].message.content,
//         outputURL: outputURL
//     };
// };


// WORKING WORKING WORKING

// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { Configuration, OpenAIApi } from "openai";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// export const main = async (prompt, numAsks, apiKey = process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-3.5-turbo-16k") => {
//     console.log("Starting script...");

//     if (!apiKey) {
//         throw new Error("API Key not found. Please check your .env file.");
//     }

//     const NUM_ASKS = Number(numAsks);

//     const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
//     progressBar.start(NUM_ASKS, 0);

//     const configuration = new Configuration({
//         apiKey: apiKey,
//     });

//     const openai = new OpenAIApi(configuration);

//     let requests = [];
//     for (let i = 0; i < NUM_ASKS; i++) {
//         const messages = [
//             { role: "system", content: "You are a helpful assistant." },
//             { role: "user", content: prompt },
//             { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer." }
//         ];
//         requests.push(openai.createChatCompletion({
//             model: model,
//             messages: messages,
//             max_tokens: 14000,
//             n: 1,
//             stop: null,
//             temperature: 1,
//         }));
//         progressBar.update(i + 1);
//     }

//     console.log("Requests sent, waiting for responses...");

//     const responses = await Promise.allSettled(requests);
//     progressBar.stop();

//     console.log("Responses received, processing...");

//     const resolvedResponses = responses.filter(r => r.status === 'fulfilled');

//     const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
//         return acc + `Answer Option ${idx+1}: ${currentResponse.value.data.choices[0].message.content} \n\n`;
//     }, `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`);

//     const researcherResponse = await openai.createChatCompletion({
//         model: model,
//         messages: [
//             { role: "system", content: "You are helpful assistant." },
//             { role: "user", content: researcherPrompt },
//             { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer." }
//         ],
//         max_tokens: 14000,
//         n: 1,
//         stop: null,
//         temperature: 1,
//     });

//     console.log("Researcher Response received, resolving...");

//     const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

//     const resolverResponse = await openai.createChatCompletion({
//         model: model,
//         messages: [
//             { role: "system", content: "You are a helpful assistant." },
//             { role: "user", content: resolverPrompt },
//             { role: "assistant", content: "Let's work this out in a step by step way to be sure we have the right answer." }
//         ],
//         max_tokens: 14000,
//         n: 1,
//         stop: null,
//         temperature: 1,
//     });

//     console.log("Resolver Response received, compiling output...");

//     const gptOutput = [
//         "# Prompt",
//         "", prompt, "",
//         "# Researcher Prompt",
//         "", researcherPrompt, "",
//         "# Researcher Response",
//         "", researcherResponse.data.choices[0].message.content, "",
//         "# Resolver Prompt",
//         "", resolverPrompt, "",
//         "# Resolver Response",
//         "", resolverResponse.data.choices[0].message.content, ""
//     ].join("\n\n");

//     const fileName = `${Date.now()}.txt`;
//     const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
//     const outputPath = path.join(outputDir, fileName);

//     // Write output to a file
//     try {
//         await fs.mkdir(outputDir, { recursive: true });
//         await fs.writeFile(outputPath, gptOutput);
//         console.log(`Output was successfully saved to ${outputPath}`);
//     } catch (err) {
//         console.error("An error occurred while writing the output to a file: ", err);
//     }

//     console.log("Script completed successfully!");

//     const outputURL = `/output/${fileName}`;

//     return {
//         prompt: prompt,
//         numAsks: NUM_ASKS,
//         researcherResponse: researcherResponse.data.choices[0].message.content,
//         resolverResponse: resolverResponse.data.choices[0].message.content,
//         outputURL: outputURL
//     };
// };




// OG CODE
// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { ChatGPTAPI } from "chatgpt";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// export const main = async (prompt, numAsks, apiKey = process.env.OPENAI_API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-4") => {
//     console.log("Starting script...");

//     if (!apiKey) {
//         throw new Error("API Key not found. Please check your .env file.");
//     }

//     const NUM_ASKS = Number(numAsks);

//     const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
//     progressBar.start(NUM_ASKS, 0);

//     const api = new ChatGPTAPI({
//         apiKey: apiKey,
//         completionParams: {
//             model: model,
//             temperature: 1 
//         },
//     });

//     let requests = [];
//     for (let i = 0; i < NUM_ASKS; i++) {
//         const message = `Question: ${prompt} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
//         requests.push(api.sendMessage(message));
//         progressBar.update(i + 1);
//     }

//     console.log("Requests sent, waiting for responses...");

//     const responses = await Promise.allSettled(requests);
//     progressBar.stop();

//     console.log("Responses received, processing...");

//     const resolvedResponses = responses.filter(r => r.status === 'fulfilled');

//     const researcherPrompt = resolvedResponses.reduce((acc, currentResponse, idx) => {
//         return acc + `Answer Option ${idx+1}: ${currentResponse.value.text} \n\n`;
//     }, `# Question: ${prompt} \n\n `) 
//     + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

//     const researcherResponse = await api.sendMessage(researcherPrompt);

//     console.log("Researcher Response received, resolving...");

//     const researcherId = researcherResponse.id;

//     const resolverPrompt = `You are a resolver tasked with 1) finding which of the ${NUM_ASKS} answer options the researcher thought was best 2) improving that answer, and 3) Printing the improved answer in full. Let's work this out in a step by step way to be sure we have the right answer:`;

//     const resolverResponse = await api.sendMessage(resolverPrompt, {
//         parentMessageId: researcherId,
//     });

//     console.log("Resolver Response received, compiling output...");

//     const gptOutput = [
//         "# Prompt",
//         "", prompt, "",
//         "# Researcher Prompt",
//         "", researcherPrompt, "",
//         "# Researcher Response",
//         "", researcherResponse.text, "",
//         "# Resolver Prompt",
//         "", resolverPrompt, "",
//         "# Resolver Response",
//         "", resolverResponse.text, ""
//     ].join("\n\n");

//     const fileName = `${Date.now()}.txt`;
//     const outputDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
//     const outputPath = path.join(outputDir, fileName);

//     // Write output to a file
//     try {
//         await fs.mkdir(outputDir, { recursive: true });
//         await fs.writeFile(outputPath, gptOutput);
//         console.log(`Output was successfully saved to ${outputPath}`);
//     } catch (err) {
//         console.error("An error occurred while writing the output to a file: ", err);
//     }

//     console.log("Script completed successfully!");

//     const outputURL = `/output/${fileName}`;

//     return {
//         prompt: prompt,
//         numAsks: NUM_ASKS,
//         researcherResponse: researcherResponse.text,
//         resolverResponse: resolverResponse.text,
//         outputURL: outputURL
//     };
// };