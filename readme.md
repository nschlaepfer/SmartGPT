<div style="display: flex;">
  <div>
    <img width="849" alt="Screenshot 2023-05-24 at 1 59 10 AM" src="https://github.com/nschlaepfer/SmartGPT/assets/44988633/85931e22-9e4c-4236-a2f6-6de87d9d9b72">
  </div>
  <div>
    <img width="492" alt="Screenshot 2023-08-30 at 1 23 03 PM" src="https://github.com/nschlaepfer/SmartGPT/assets/44988633/9ce21189-3463-4d38-b37c-934bc5d814ad">
  </div>
</div>




<img width="1840" alt="Screenshot 2023-05-07 at 3 29 43 PM" src="https://github.com/nschlaepfer/SmartGPT/assets/44988633/8b6d6be6-85a6-4baa-954e-14211df0a230">

# SmartGPT: Enhancing Text Generation with Dynamic Prompting

SmartGPT is a Node.js-based tool that introduces a dynamic prompting system to the world of AI-driven text generation. Informed by 'AI Explained' on YouTube, it generates multiple responses to a given prompt and evaluates their quality, thereby facilitating the creation of improved and more relevant AI responses.

## Why SmartGPT?

This project emerged from a desire to explore the vast capabilities of the OpenAI API and ChatGPT API in creating intelligent, interactive applications. Inspired by the paper 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models', it also represents a foray into the domain of deliberate problem solving with large language models. With SmartGPT, the aim is to generate high-quality text responses that excel in terms of relevance, coherence, and accuracy.

## Getting Started

### Prerequisites

To get SmartGPT up and running, you will need:

1. Node.js installed on your system. You can download it [here](https://nodejs.org/).

2. An OpenAI API key. To obtain one, register on the [OpenAI platform](https://www.openai.com/).

### Installation Steps

Follow these steps to install SmartGPT:

1. Clone this repository or download the source files.

2. Navigate to the directory containing the `smartgpt.js` file. Run the following command to install the necessary dependencies:
   
   ```
   npm install
   ```
   
3. Make a copy of the `.example.env` file in the same directory as `smartgpt.js`, and rename it to `.env`.

4. Open the `.env` file and replace `your_api_key_here` with your OpenAI API key.

## Usage

To get SmartGPT running, enter the following command:

```
node server
```

Once running, you will be prompted to input a number, specifying how many response options the program should generate and evaluate. While this number could be any positive integer, the efficiency of the evaluation may vary for numbers greater than 3, depending on the complexity of the prompt and topic.

This article here showcases some Zero-Shot Failures of GPT that could be possibly solved with this system in the future: https://medium.com/@konstantine_45825/gpt-4-cant-reason-2eab795e2523

Questions related to summation or counting still have issues. This could easily be solved by adding a toolbelt like system to point the LLM at a set of tools to accomplish mathatical calculations. 

The generated outputs are logged to the console, and the entire conversations are saved in the `output` folder for future reference.

## Core Components and Usage Reference

### smartgpt.js

This is the main script file. It interfaces with the OpenAI API and ChatGPT API to generate and evaluate responses. The following points detail the sequence of operations:

1. The script verifies the presence of the API key in the `.env` file. If it doesn't exist, an error is thrown.

2. A progress bar is initialized to provide real-time visual feedback.

3. The script generates a specific number of responses to the prompt (specified by the user at runtime).

4. Once all responses are received, a 'researcher' prompt asking for critical review of all answer options is prepared.

5. The researcher’s response is sent to the API.

6. A ‘resolver’ prompt is generated, which instructs the AI to identify the best answer and refine it.

7. The resolver’s response is received, and the final output is compiled and saved in the `output` folder.

### Other Script Files

`congressGPT.js` and `TreeOfThought.js` employ different strategies for deliberate problem solving with large language models.

- `congressGPT.js` uses ChatGPT API to simulate different roles (researcher, builder, refiner, deliverer) that collaborate to find and enhance the best answer option.

- `TreeOfThought.js` creates a tree-like structure of thoughts branching from an initial prompt. Each thought node is evaluated for its quality and state.

For more details on these scripts, please

 refer to their respective files or read the provided comments.

## Citation

Please cite this project as follows if used in your research or work:

```bibtex
@misc{SmartGPT,
  author = {Nicolas Schlaepfer},
  title = {SmartGPT: A Dynamic Prompting System, Inspired by AI Explained on YT},
  year = {2022},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\url{https://github.com/nschlaepfer/SmartGPT}},
}
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [ChatGPT API Documentation](https://platform.openai.com/docs/guides/chat)
- 'Tree of Thoughts: Deliberate Problem Solving with Large Language Models'

## Project Structure

The main file for this project is `smartgpt.js`. Other important files and directories are outlined below:

```
.
├── TreeOfThought
│   ├── TreeOfThought.js
│   ├── TreeOfThought.md
│   ├── log.txt
│   ├── server.js
│   ├── thoughtNode.test.js
│   └── views
│       ├── index.ejs
│       ├── result.ejs
│       └── styles.css
├── congressGPT
│   ├── congressGPT.js
│   ├── congressGPT.py
│   └── congressReadme.md
├── features.md
├── filestructure.txt
├── old outputs
│   ├── various generated .txt files
├── package-lock.json
├── package.json
├── public
│   └── styles.css
├── readme.md
├── script.js
├── server.js
├── smartgpt.js
└── views
    ├── index.ejs
    ├── output.ejs
    └── styles.css
```
