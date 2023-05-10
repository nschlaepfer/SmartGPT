# SmartGPT

SmartGPT is a Node.js script implementation of a dynamic prompting system, inspired by [AI Explained](https://www.youtube.com/@ai-explained-) on YouTube. This tool generates multiple responses to a prompt and evaluates their quality, which can be particularly useful for improving AI-driven text generation. Check out the original video tutorial [here](https://www.youtube.com/watch?v=wVzuvf9D9BU).

## Prerequisites

- Node.js installed on your system. Download it from [here](https://nodejs.org/en/download/).
- An OpenAI API key. Register on the [OpenAI platform](https://beta.openai.com/signup/) to obtain one.

## Installation

1. Clone this repository or download the source files.

2. Navigate to the directory containing the `smartgpt.js` file, then run the following command to install necessary dependencies:

   ```bash
   npm install
   ```

3. Make a copy of the `.example.env` file in the same directory as `smartgpt.js` and rename it to `.env`.

4. Open the `.env` file and replace `your_api_key_here` with your OpenAI API key.

## Usage

To run the script, type the following command:

```bash
node server
```

Upon running, you will be prompted to enter a number. This number specifies how many response options the program will generate and evaluate. Although the number of responses can technically be any positive integer, the effectiveness of the evaluation may vary for numbers beyond 3, depending on the complexity of the prompt and topic.

The outputs are logged to the console, and the entire conversations are saved in the output folder for later review.

## Code Explanation

The code is structured in a way that it interacts with the OpenAI API to generate and evaluate responses to a given prompt. Here's a brief explanation of the flow:

1. The script first verifies if the API key exists in the `.env` file. If it doesn't, an error is thrown.
2. A progress bar is initialized to provide visual feedback during the operation.
3. The script generates a certain number of responses to the prompt (the number is specified by the user at runtime).
4. Once all responses are received, the script prepares a 'researcher' prompt that asks for a critical review of all answer options.
5. The researcher's response is then sent to the API.
6. A 'resolver' prompt is generated, which tasks the AI with identifying the best answer and improving upon it.
7. The resolver's response is received, and the final output is compiled and saved in the `output` folder in the project's directory.

## Acknowledgements

This project was inspired by the content provided by [AI Explained](https://www.youtube.com/@ai-explained-). Be sure to check them out for more AI-related content.