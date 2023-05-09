# SmartGPT

A Node.js script implementation of the SmartGPT prompting system by [AI Explained](https://www.youtube.com/@ai-explained-) on youtube, see the video [here](https://www.youtube.com/watch?v=wVzuvf9D9BU)

## Prerequisites

- Node.js installed on your machine. You can download it from [here](https://nodejs.org/en/download/).
- An OpenAI API key. You can get one by signing up on the [OpenAI platform](https://beta.openai.com/signup/).

## Installation

1. Clone this repository or download the files.

2. In the directory containing the `smartgpt.js` file, run the following command to install the required dependencies:

   ```bash
   npm install
   ```

3. Create a copy of the `.example.env` file in the same directory as `smartgpt.js` and rename it to `.env` (literally nothing before the dot).

4. Open the `.env` file and replace `your_api_key_here` with your actual OpenAI API key.

## Usage

To run the script, execute the following command:

```bash
node smartgpt.js "Your prompt goes here" [options]
```

Outputs are logged to console and the entire conversations are saved in the output folder for later review.

### Options

- `--model`: Specify the model name to use (default: "gpt-4").
   Example: `--model "gpt-3.5-turbo"`

- `--numAsks`: Specify the number of response options to generate (default: 3).
   Example: `--numAsks 4`

- `--logging`: Enable verbose logging (default: false).
   Example: `--logging`

#### Example

```bash
node smartgpt.js "I left 5 clothes out to dry in the sun. It took them 5 hours to dry completely. How long would it take to dry 30 clothes?" --model "gpt-3.5-turbo" --numAsks 4 --logging
```

This command will use the "gpt-3.5-turbo" model, generate 4 response options, and enable verbose logging.