import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { ChatGPTAPI } from "chatgpt";
import minimist from 'minimist';
import cliProgress from 'cli-progress';
import winston from 'winston';
import envalid from 'envalid';

dotenv.config();

const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    API_KEY: str(),
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
    ],
});

class ThoughtNode {
    constructor(value, children = []) {
        this.value = value;
        this.children = children;
    }

    addChild(node) {
        this.children.push(node);
    }
}

class ThoughtTree {
    constructor(rootValue) {
        this.root = new ThoughtNode(rootValue);
    }

    async generateThoughts(node, api, progressBar, numAsks) {
        let requests = [];
        for (let i = 0; i < numAsks; i++) {
            try {
                const message = `Question: ${node.value} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
                progressBar.update(i + 1, { stage: 'Generating Thoughts' });
                logger.info(`Generating thought ${i + 1}`);
                requests.push(api.sendMessage(message));
            } catch (error) {
                progressBar.update(i + 1, { stage: 'Generating Thoughts', error: true });
                logger.error(`Error generating thoughts: ${error}`);
                throw new Error(`Error generating thoughts: ${error}`);
            }
        }
    
        return Promise.allSettled(requests);
    }
    

    async evaluateState(node, api, progressBar, numAsks) {
        try {
            const researcherPrompt = node.children.reduce((acc, currentResponse, idx) => {
                return acc + `Answer Option ${idx + 1}: ${currentResponse.value.text} \n\n`;
            }, `# Question: ${node.value} \n\n `)
                + `You are a researcher tasked with investigating the ${numAsks} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;
    
            progressBar.update(0, { stage: 'Evaluating State' });
            logger.info('Evaluating state');
            return api.sendMessage(researcherPrompt);
        } catch (error) {
            progressBar.update(0, { stage: 'Evaluating State', error: true });
            logger.error(`Error evaluating state: ${error}`);
            throw new Error(`Error evaluating state: ${error}`);
        }
    }
    
}

export const main = async (prompt, numAsks, apiKey = env.API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-4") => {
    logger.info("Starting script...");

    const NUM_ASKS = Number(numAsks);
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(NUM_ASKS, 0);

    const api = new ChatGPTAPI({
        apiKey: apiKey,
        completionParams: {
            model: model,
            temperature: 1,

        },
    });

    const thoughtTree = new ThoughtTree(prompt);

    try {
        logger.info('Executing Tree of Thoughts algorithm...');
        const thoughts = await thoughtTree.generateThoughts(thoughtTree.root, api, progressBar);

        logger.info('Thought generation completed.');

        thoughts.forEach((thought) => {
            const childNode = new ThoughtNode(thought.value);
            thoughtTree.root.addChild(childNode);
        });

        logger.info('Thoughts:', thoughts);

        logger.info('Evaluating state...');
        const state = await thoughtTree.evaluateState(thoughtTree.root, api, progressBar);
        logger.info('State evaluation completed.');

        if (state !== 'satisfactory') {
            await Promise.all(thoughtTree.root.children.map(async (childNode) => {
                try {
                    await thoughtTree.generateThoughts(childNode, api, progressBar);
                    await thoughtTree.evaluateState(childNode, api, progressBar);
                } catch (error) {
                    logger.error(`Error executing the Tree of Thoughts algorithm: ${error}`);
                }
            }));
        }

        progressBar.stop();
        logger.info("Script completed successfully!");
        return state;
    } catch (error) {
        progressBar.stop();
        logger.error(`Error executing the Tree of Thoughts algorithm: ${error}`);
    }
};






// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { ChatGPTAPI } from "chatgpt";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// class ThoughtNode {
//     constructor(value, children = []) {
//         this.value = value;
//         this.children = children;
//     }

//     addChild(node) {
//         this.children.push(node);
//     }
// }

// class ThoughtTree {
//     constructor(rootValue) {
//         this.root = new ThoughtNode(rootValue);
//     }

//     generateThoughts(node, api, NUM_ASKS, progressBar) {
//         let requests = [];
//         for (let i = 0; i < NUM_ASKS; i++) {
//             const message = `Question: ${node.value} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
//             requests.push(api.sendMessage(message));
//             progressBar.update(i + 1);
//         }

//         return Promise.allSettled(requests);
//     }

//     evaluateState(node, api, NUM_ASKS) {
//         const researcherPrompt = node.children.reduce((acc, currentResponse, idx) => {
//             return acc + `Answer Option ${idx + 1}: ${currentResponse.value.text} \n\n`;
//         }, `# Question: ${node.value} \n\n `)
//             + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

//         return api.sendMessage(researcherPrompt);
//     }

//     async execute(node, api, NUM_ASKS, progressBar) {
//         // Generate thoughts for the current node
//         const thoughts = await this.generateThoughts(node, api, NUM_ASKS, progressBar);

//         // Add the generated thoughts as children of the current node
//         thoughts.forEach(thought => {
//             const childNode = new ThoughtNode(thought);
//             node.addChild(childNode);
//         });

//         // Evaluate the state of the current node
//         const state = await this.evaluateState(node, api, NUM_ASKS);

//         // If the state is not satisfactory, execute the algorithm for each child
//         if (state !== 'satisfactory') {
//             for (let childNode of node.children) {
//                 await this.execute(childNode, api, NUM_ASKS, progressBar);
//             }
//         }

//         // Return the final state of the node
//         return state;
//     }
// }

// export const main = async (prompt, numAsks, apiKey = process.env.API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-4") => {
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

//     const thoughtTree = new ThoughtTree(prompt);

//     // Execute the Tree of Thoughts algorithm
//     const deliverOutput = await thoughtTree.execute(thoughtTree.root, api, NUM_ASKS, progressBar);

//     progressBar.stop();

//     console.log("Script completed successfully!");

//     return deliverOutput;
// };



//untested code

// import fs from 'fs/promises';
// import path from 'path';
// import dotenv from 'dotenv';
// import { ChatGPTAPI } from "chatgpt";
// import minimist from 'minimist';
// import cliProgress from 'cli-progress';

// dotenv.config();

// class ThoughtNode {
//     constructor(value, children = []) {
//         this.value = value;
//         this.children = children;
//     }

//     addChild(node) {
//         this.children.push(node);
//     }
// }

// class ThoughtTree {
//     constructor(rootValue) {
//         this.root = new ThoughtNode(rootValue);
//     }

//     generateThoughts(node, api, NUM_ASKS, progressBar) {
//         let requests = [];
//         for (let i = 0; i < NUM_ASKS; i++) {
//             const message = `Question: ${node.value} \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.`;
//             requests.push(api.sendMessage(message));
//             progressBar.update(i + 1);
//         }

//         return Promise.allSettled(requests);
//     }

//     evaluateState(node, api, NUM_ASKS) {
//         const researcherPrompt = node.children.reduce((acc, currentResponse, idx) => {
//             return acc + `Answer Option ${idx + 1}: ${currentResponse.value.text} \n\n`;
//         }, `# Question: ${node.value} \n\n `)
//             + `You are a researcher tasked with investigating the ${NUM_ASKS} response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:`;

//         return api.sendMessage(researcherPrompt);
//     }

//     execute(api, NUM_ASKS) {
//         // Implement your Tree of Thoughts execution logic here
//     }
// }

// export const main = async (prompt, numAsks, apiKey = process.env.API_KEY || minimist(process.argv.slice(2)).apiKey, model = "gpt-4") => {
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

//     const thoughtTree = new ThoughtTree(prompt);

//     // Generate thoughts for the root node
//     const researchOutput = await thoughtTree.generateThoughts(thoughtTree.root, api, NUM_ASKS, progressBar);

//     // Evaluate the state of the root node
//     const planOutput = await thoughtTree.evaluateState(thoughtTree.root, api, NUM_ASKS);

//     // Execute the Tree of Thoughts algorithm
//     const deliverOutput = await thoughtTree.execute(api, NUM_ASKS);

//     progressBar.stop();

//     console.log("Script completed successfully!");

//     return deliverOutput;
// };
