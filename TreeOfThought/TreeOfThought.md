# Tree of Thought

Tree of Thought is a script that uses OpenAI's GPT-4 model to generate a tree of thoughts based on a given prompt. The script generates multiple responses to the prompt, evaluates the responses, and recursively generates and evaluates new responses based on the evaluation results.

## How it works


Imports and setup: The script imports necessary modules and sets up the environment. It uses the dotenv package to load environment variables from a .env file. It also defines two classes, ThoughtNode and ThoughtTree, which are used to represent nodes and trees of thoughts, respectively.

ThoughtNode class: This class represents a single node in the thought tree. Each node has a value (the thought) and a list of children (sub-thoughts).

ThoughtTree class: This class represents a tree of thoughts. It has a root node and methods to generate thoughts, evaluate the state of a node, and execute the thought generation process.

generateThoughts method: This method generates a number of thoughts based on the value of a given node. It sends a message to the GPT-3 API for each thought to be generated and returns a promise that resolves when all thoughts have been generated.

evaluateState method: This method evaluates the state of a given node. It constructs a prompt for the GPT-3 API based on the node's value and its children's values, sends the prompt to the API, and returns the API's response.

execute method: This method executes the thought generation process for a given node. It generates thoughts for the node, adds them as children of the node, evaluates the state of the node, and if the state is not satisfactory, recursively executes the process for each child node.

main function: This is the main entry point of the script. It checks for the presence of an API key, creates an instance of the ChatGPTAPI class with the API key and other parameters, creates a ThoughtTree with a given prompt, executes the thought generation process for the tree's root node, and returns the final state of the root node.



## Improvements









## Installation

1. Clone this repository to your local machine.
2. Run `npm install` to install the necessary dependencies.

## Usage

1. Create a `.env` file in the root directory of the project and add your OpenAI API key:

    ```env
    API_KEY=your_openai_api_key
    ```

2. Run the script with the following command:

    ```bash
    node index.js --prompt "Your prompt here" --numAsks 5
    ```

    Replace "Your prompt here" with your desired prompt and `5` with the number of responses you want to generate for each prompt.

## How It Works

The script uses a tree data structure to represent the thought process. Each node in the tree represents a thought, and the children of a node represent the responses to that thought.

The script starts by generating responses to the root thought (the initial prompt). It then evaluates each response and generates new responses based on the evaluation results. This process is repeated recursively until a satisfactory thought is found.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
