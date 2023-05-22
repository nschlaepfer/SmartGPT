# congressGPT

congressGPT is a new feature that enhances the capabilities of your existing smartgpt.js code. It introduces a more exhaustive thought process to generate the best possible result for a given user prompt. The thought process is divided into five stages:

1. **Investigate/Research**: The prompt is thoroughly investigated and researched to understand the context and requirements.

```markdown
1. **Investigate/Research**: The prompt is thoroughly investigated and researched to understand the context and requirements.
2. **Plan/Organize**: The information gathered from the research is used to plan and organize the next steps.
3. **Build/Execute**: The plan is executed to generate a response to the prompt.
4. **Refine/Improve**: The response is refined and improved based on feedback and additional insights.
5. **Deliver/Future Plan**: The final response is delivered and future plans are made to handle similar prompts more efficiently.

## Installation

To install congressGPT, you need to have Node.js and npm installed on your machine. Then, you can clone this repository and run `npm install` to install the dependencies.

```bash
git clone https://github.com/your-username/congressGPT.git
cd congressGPT
npm install
```

## Usage

To use congressGPT, you need to import it and call the `main` function with the user's prompt as an argument. The function will return the final response after going through all the stages of the thought process.

```javascript
import { main as congressGPT } from './congressGPT.js';

const prompt = 'Your user prompt goes here';
const response = await congressGPT(prompt);
console.log(response);
```

You can also pass an optional second argument to specify the number of response options to generate in the research stage. The default value is 3.

```javascript
const prompt = 'Your user prompt goes here';
const numAsks = 5; // generate 5 response options
const response = await congressGPT(prompt, numAsks);
console.log(response);
```

You can also pass an optional third argument to specify the API key for ChatGPTAPI, which is used to communicate with the GPT-4 model. The default value is read from the `.env` file.

```javascript
const prompt = 'Your user prompt goes here';
const numAsks = 5; // generate 5 response options
const apiKey = 'your-api-key-here'; // use your own API key
const response = await congressGPT(prompt, numAsks, apiKey);
console.log(response);
```

You can also pass an optional fourth argument to specify the model name for ChatGPTAPI. The default value is `gpt-4`.

```javascript
const prompt = 'Your user prompt goes here';
const numAsks = 5; // generate 5 response options
const apiKey = 'your-api-key-here'; // use your own API key
const model = 'gpt-3'; // use a different model
const response = await congressGPT(prompt, numAsks, apiKey, model);
console.log(response);
```

## Output

The output of congressGPT is an object with three properties: `prompt`, `numAsks`, and `gptOutput`. The `prompt` and `numAsks` are the same as the input arguments. The `gptOutput` is a string that contains the full conversation between the user and the GPT-4 model, including the prompts and responses for each stage of the thought process. For example:

```json
{
  "prompt": "How do I write a good README?",
  "numAsks": 3,
  "gptOutput": "# Prompt\n\nHow do I write a good README?\n\n# Researcher Prompt\n\nQuestion: How do I write a good README? \n\n Answer: Let's work this out in a step by step way to be sure we have the right answer.\n\nAnswer Option 1: A good README should include a title, a description, installation instructions, usage examples, license information, and contact details.\n\nAnswer Option 2: A good README should have a clear and concise title, a brief summary of what the project does and why it is useful, a list of features and requirements, a guide on how to install and run the project, some code snippets or screenshots to demonstrate how it works, information on how to contribute or report issues, and a license section that specifies the terms of use.\n\nAnswer Option 3: A good README should explain what the project is about, how to get started with it, how to use it effectively, and how to get help or support if needed. It should also provide some background information on the motivation and goals of the project, as well as acknowledgements or credits to other contributors or sources.\n\nYou are a researcher tasked with investigating the 3 response options provided. List the flaws and faulty logic of each answer option. Let's work this out in a step by step way to be sure we have all the errors:\n\n# Researcher Response\n\nAnswer Option 1: This answer is too vague and does not provide enough detail on what each section should contain. It also does not mention anything about formatting or style guidelines for writing a README.\n\nAnswer Option 2: This answer is more comprehensive and specific than option 1, but it may be too long and complex for some projects. It also assumes that the project has a code base that can be demonstrated with snippets or screenshots, which may not be true for some types of projects.\n\nAnswer Option 3: This answer is simpler and more general than option 2, but it still covers the essential elements of a good README. It also allows for some flexibility and customization depending on the nature and scope of the project.\n\n# Builder Prompt\n\nYou are a builder tasked with 1) finding which of the 3 answer options the researcher thought was best 2) creating a plan to execute that answer, and 3) Printing the execution plan in full. Let's work this out in a step by step way to be sure we have the right answer:\n\n# Builder Response\n\nThe researcher thought that option 3 was the best answer because it was simple and general but still covered the essential elements of a good README. To execute that answer, we need to do the following steps:\n\n- Write a clear and concise title that describes what the project is about.\n- Write a brief summary of what the project does and why it is useful.\n- Write a list of features and requirements that describe what the project can do and what it needs to run.\n- Write a guide on how to install and run the project, including any dependencies or configuration steps.\n- Write some examples or instructions on how to use the project effectively.\n- Write some information on how to get help or support if needed, such as links to documentation, forums, or contact details.\n- Write some background information on the motivation and goals of the project, as well as acknowledgements or credits to other contributors or sources.\n- Write a license section that specifies the terms of use for the project.\n- Format and style the README according to some common conventions or best practices.\n\nThe execution plan in full is:\n\n# Execution Plan\n\n- Title: How to write a good README\n- Summary: This project is a guide on how to write a good README for your projects. It explains what a README is, why it is important, and what it should contain.\n- Features and requirements: This project does not have any specific features or requirements. It is just a text document that can be viewed with any text editor or browser.\n- Installation and running: To view this project, you just need to open the README.md file with your preferred text editor or browser. You do not need to install or run anything else.\n- Usage examples: To use this project as a reference or template for your own READMEs, you can copy or modify any part of it as you wish. You can also check out some examples of good READMEs from other projects on GitHub or other platforms.\n- Help and support: If you need any help or support with this project or with writing your own READMEs, you can visit some of these resources:\n    - [GitHub Guides: Mastering Markdown](https://guides.github.com/features/mastering-markdown/)\n    - [Make a README](https://www.makeareadme.com/)\n    - [Awesome README](https://github.com/matiassingers/awesome-readme)\n    - [Stack Overflow](https://stackoverflow.com/questions/tagged/readme)\n    - [Contact me](https://github.com/your-username)\n- Background information: I created this project as a way to practice my writing skills and to share some tips on how to write good READMEs for your projects. I think that writing good READMEs is an important skill for any developer or creator who wants to showcase their work and make it easy for others to understand and use it. I also learned a lot from reading other people's READMEs and from various online resources.\n- License: This project is licensed under [MIT License](https://opensource.org/licenses/MIT).\n- Formatting and style: I used Markdown syntax to format and style this README. Markdown is a simple and widely used markup language that allows you to create rich text documents with plain text. You can learn more about Markdown syntax [here](https://www.markdownguide.org/basic-syntax/).\n"
    }
}
```
