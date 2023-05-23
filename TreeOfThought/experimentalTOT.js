// Import Classy library
var classy = require('classy');

// Define an abstract class using Classy
var AbstractLanguageModel = classy.Class.$extend({
  // Define an abstract method using $abstract
  generate_thoughts: classy.$abstract,
  // Define another abstract method
  evaluate_states: classy.$abstract
});

// Define a subclass using Classy
var CustomLanguageModel = AbstractLanguageModel.$extend({
  // Define the constructor
  __init__: function(model) {
    this.model = model;
  },
  // Override the abstract method
  generate_thoughts: function(state, k) {
    // Implement the thought generation logic using this.model
  },
  // Override another abstract method
  evaluate_states: function(states) {
    // Implement state evaluation logic using this.model
  }
});

// Define another subclass using Classy
var OpenAILanguageModel = AbstractLanguageModel.$extend({
  // Define the constructor
  __init__: function(api_key, strategy="cot", evaluation_strategy="value", api_base="", api_model="", enable_ReAct_prompting=true) {
    if (api_key == "" || api_key == null) {
      api_key = process.env.OPENAI_API_KEY || "";
      if (api_key != "") {
        openai.api_key = api_key;
      } else {
        throw new Error("Please provide OpenAI API key");
      }
    }

    if (api_base == "" || api_base == null) {
      api_base = process.env.OPENAI_API_BASE || ""; // if not set, use the default base path of "https://api.openai.com/v1"
      if (api_base != "") {
        // e.g. https://api.openai.com/v1/ or your custom url
        openai.api_base = api_base;
        console.log(`Using custom api_base ${api_base}`);
      }
    }

    if (api_model == "" || api_model == null) {
      api_model = process.env.OPENAI_API_MODEL || "";
      if (api_model != "") {
        this.api_model = api_model;
      } else {
        this.api_model = "text-davinci-003";
        console.log(`Using api_model ${this.api_model}`);
      }
    }

    this.use_chat_api = 'gpt' in this.api_model;

    // reference : https://www.promptingguide.ai/techniques/react
    this.ReAct_prompt = '';
    if (enable_ReAct_prompting) {
      this.ReAct_prompt = "Write down your observations in format 'Observation:xxxx', then write down your thoughts in format 'Thoughts:xxxx'.";
    }

    this.strategy = strategy;
    this.evaluation_strategy = evaluation_strategy;
  },
  // Override the abstract method
  generate_thoughts: function(state, k) {
    var state_text = state.join(' ');
    
    var prompt = `Given the current state of reasoning: '${state_text}', generate ${1} coherent thoughts to continue the reasoning process:`;
    prompt += this.ReAct_prompt;
    if (this.use_chat_api) {
      var new_prompt_success = false;
      /*
      # Try prompt and parse in a single shot to save tokens (but if we fail, we end up spending more tokens)
      new_prompt = prompt + "Thought string should be output in a format that can be parsed into javascript array in format [xxx,xxx,xxx]";
      var response = this.openai_api_call_handler(new_prompt, 100 * k, 0.5, 1);
      var text = this.openai_choice2text_handler(response.choices[0]);
      var re_parse = text.match(/\[(.*?)\]/);
      if (re_parse) {
        var thoughts_str = re_parse[1];
        if (thoughts_str) {
          var thoughts = thoughts_str.split(',');
          new_prompt_success = thoughts.length == k; 
        }
      }
      if (!new_prompt_success) {
        console.log(`Fall back to multi-prompt for chat-completion due to parse fail ${text}`);
      }
      
      */
      if (!new_prompt_success) {
        var thoughts = [];
        for (var i = 0; i < k; i++) {
          var response = this.openai_api_call_handler(prompt, 50, 0.5, k);
          var text = this.openai_choice2text_handler(response.choices[0]);
          thoughts.push(text);
        }
        
      }
      
    } else {
      var response = this.openai_api_call_handler(prompt, 50, 0.5, k);
      var thoughts = response.choices.map(choice => this.openai_choice2text_handler(choice));
      
    }
    // console.log(thoughts);
    console.log(`Generated thoughts: ${thoughts}`);
    return thoughts;
    
  },
  // Override another abstract method
  evaluate_states: function(states) {
    if (this.evaluation_strategy == 'value') {
      var state_values = {};
      for (var state of states) {
        var state_text = state.join(' ');
        var prompt = `Given the current state of reasoning: '${state_text}', evaluate its value as a float between 0 and 1, and NOTHING ELSE:`;
        var response = this.openai_api_call_handler(prompt, 10, 1);
        try {
          var value_text = this.openai_choice2text_handler(response.choices[0]);
          var value = parseFloat(value_text);
          console.log(`value: ${value}`);
        } catch (error) {
          value = 0; // Assign a default value if the conversion fails
        }
        state_values[state] = value;
        
      }
      
      return state_values;
      
    } else if (this.evaluation_strategy == 'vote') {
      var states_text = states.map(state => state.join(' ')).join('\n');
      var prompt = `Given the following states of reasoning, vote for the best state:\n${states_text}\n\nVote, and NOTHING ELSE:`;
      var response = this.openai_api_call_handler(prompt, 50, 1);
      var best_state_text = this.openai_choice2text_handler(response.choices[0]);
      console.log(`Best state text: ${best_state_text}`);
      var best_state = best_state_text.split();
      
      return states.reduce((obj, state) => {obj[state] = state == best_state ? 1 : 0; return obj}, {});
      
    } else {
      
      throw new Error("Invalid evaluation strategy. Choose 'value' or 'vote'.");
      
    }
    
  },
  
});

// Define another subclass using Classy
var OptimizedOpenAILanguageModel = OpenAILanguageModel.$extend({
  
});

// Define another subclass using Classy
var GuidanceLanguageModel = AbstractLanguageModel.$extend({
  // Define the constructor
  __init__: function(model, strategy="cot", evaluation_strategy="value") {
    // guidance.llms.OpenAI("gpt-4")
    this.model = model;
  },
  // Override the abstract method
  generate_thoughts: function(state, k) {
    // Implement the thought generation logic using this.model
  },
  // Override another abstract method
  evaluate_states: function(states) {
    // Implement state evaluation logic using this.model
  }
});

// Define another subclass using Classy
var GuidanceOpenAILanguageModel = GuidanceLanguageModel.$extend({
  // Define the constructor
  __init__: function(api_key, strategy="cot", evaluation_strategy="value", api_base="", api_model="") {
    if (api_key == "" || api_key == null) {
      api_key = process.env.OPENAI_API_KEY || "";
      if (api_key != "") {
        openai.api_key = api_key;
      } else {
        throw new Error("Please provide OpenAI API key");
      }
    }

    if (api_base == "" || api_base == null) {
      api_base = process.env.OPENAI_API_BASE || ""; // if not set, use the default base path of "https://api.openai.com/v1"
      if (api_base != "") {
        // e.g. https://api.openai.com/v1/ or your custom url
        openai.api_base = api_base;
        console.log(`Using custom api_base ${api_base}`);
      }
    }

    if (api_model == "" || api_model == null) {
      api_model = process.env.OPENAI_API_MODEL || "";
      if (api_model != "") {
        this.api_model = api_model;
      } else {
        this.api_model = "text-davinci-003";
        console.log(`Using api_model ${this.api_model}`);
      }
    }

    super.__init__(guidance.llms.OpenAI(this.api_model), strategy, evaluation_strategy);
  }
});

// Define a class using Classy
var TreeofThoughts = classy.Class.$extend({
  // Define the constructor
  __init__: function(model, search_algorithm) {
    this.model = model;
    this.search_algorithm = search_algorithm;
  },
  // Define a method
  solve: function(x, k, T, b, vth, timeout=null) {
    var start_time = Date.now();
    if (this.search_algorithm == 'BFS') {
      while (timeout == null || Date.now() - start_time < timeout) {
        var result = this.tot_bfs(x, k, T, b);
        if (result) {
          return result;
        }
      }
    } else if (this.search_algorithm == 'DFS') {
      while (timeout == null || Date.now() - start_time < timeout) {
        var result = this.tot_dfs(x, k, T, vth);
        if (result) {
          return result;
        }
      }
    } else {
      throw new Error("Invalid search algorithm. Choose 'BFS' or 'DFS'.");
    }
  },
  // Define another method
  tot_bfs: function(x, k, T, b) {
    var S0 = new Set([x]);
    for (var t = 1; t <= T; t++) {
      var S0_t = new Set();
      for (var s of S0) {
        for (var z of this.model.generate_thoughts(s, k)) {
          S0_t.add([...s, z]);
        }
      }
      var Vt = this.model.evaluate_states(S0_t);
      var St = [...S0_t].sort((a,b) => Vt[b] - Vt[a]).slice(0,b);
      S0 = new Set(St);
    }
    return this.model.generate_thoughts([...S0].reduce((a,b) => Vt[a] > Vt[b] ? a : b), 1);
  },
  // Define another method
  tot_dfs: function(x, k, T, vth) {
    var output = [];
    
    var dfs = function(s,t) {
      if (t > T) {
        var thought = this.model.generate_thoughts(s,1);
        var value = this.model.evaluate_states(new Set([s]))[s];
        output.push([thought,value]);
        return false;
      }

      for (var s_prime of this.model.generate_thoughts(s,k).sort()) {
        var state_value = this.model.evaluate_states(new Set([s_prime]))[s_prime];
        if (state_value > vth) {
          if (dfs([...s,s_prime], t+1)) {
            return true;
          }
        }
      }

      return false;
    }.bind(this);

    dfs(x,1);
    return output.reduce((a,b) => a[1] > b[1] ? a : b);
    
  }
});

// Define another class using Classy
var OptimizedTreeofThoughts = TreeofThoughts.$extend({
  
});