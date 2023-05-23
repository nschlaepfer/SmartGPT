

# Abstract Language Model: TOT experiemnent js

## Description

This project is a JavaScript implementation of an abstract class for language models. It defines two abstract methods: `generate_thoughts` and `evaluate_states`, which are meant to be overridden by subclasses. The project also provides some examples of subclasses that inherit from the abstract class and implement different language models using OpenAI, Classy, and Guidance libraries.

The motivation for this project is to demonstrate how to use JavaScript to create abstract classes and subclasses, as well as how to use different language models for generating and evaluating thoughts based on a given state of reasoning.

The project solves the problem of creating a common interface for different language models, as well as providing some examples of how to use them.

The project uses the following technologies:

- JavaScript: The main programming language for the project.
- Classy: A JavaScript library that tries to bring Python-like classes to JavaScript¹.
- OpenAI: A platform that provides access to powerful language models such as GPT-3².
- Guidance: A library that provides tools for building large language models³.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [License](#license)
- [Contributing](#contributing)
- [Tests](#tests)
- [Questions](#questions)

## Installation

To install the project, you need to have Node.js installed on your machine. You can download it from [here](https://nodejs.org/en/).

You also need to install the dependencies for the project. You can do this by running the following command in the terminal:

```bash
npm install
```

This will install the following packages:

- classy: A JavaScript library that tries to bring Python-like classes to JavaScript.
- openai: A Node.js wrapper for OpenAI API.
- guidance: A library that provides tools for building large language models.

## Usage

To use the project, you need to have an OpenAI API key and set it as an environment variable. You can get one from [here](https://openai.com/).

You also need to specify the OpenAI API base and model as environment variables, or use the default ones.

You can then run the project by using the following command in the terminal:

```bash
node index.js
```

This will execute the main file of the project, which contains some examples of how to use the different subclasses of the abstract class.

You can also modify the file or create your own files to use the abstract class and its subclasses.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Contributing

If you want to contribute to this project, you can fork it and make a pull request with your changes. You can also open an issue if you find any bugs or have any suggestions.

## Tests

This project does not have any tests at the moment. If you want to write some tests, you can use a testing framework such as Jest or Mocha.

