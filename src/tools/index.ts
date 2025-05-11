// Tools configuration
import toolsConfig from "./config.js";
import { SmartGPT } from "../index.js";
import { FallbackRetriever } from "../search/retrievers.js";
import { MemoryStore } from "../memory/memory.js";
import { DeepExplorer } from "../search/deepExplorer.js";
import OpenAI from "openai";

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Define WebResult interface
interface WebResult {
  title: string;
  link: string;
  snippet: string;
}

// SmartGPT tools
export async function smartgpt_answer({ query }: { query: string }) {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        "[SmartGPT] No OPENAI_API_KEY found, returning simulated response"
      );
      return {
        answer: `SmartGPT simulation mode: This is a simulated response to your query: "${query}"\n\nTo use real SmartGPT capabilities, please set up your OpenAI API key in the .env file.`,
        confidence: 0.5,
      };
    }

    // Initialize SmartGPT with default configuration
    const smartGPT = new SmartGPT({
      apiKey: process.env.OPENAI_API_KEY || "",
      contextModel: "gpt-4.1",
      reasoningModel: "o4-mini",
      deep: false,
    });

    // Get answer from SmartGPT
    const answer = await smartGPT.ask(query);

    return {
      answer,
      confidence: 0.9, // Default confidence for standard SmartGPT
    };
  } catch (error: any) {
    console.error("[SmartGPT] Error in smartgpt_answer:", error);
    return {
      answer: `Error processing your query: ${
        error.message || "Unknown error"
      }.\n\nPlease check your API configuration in the .env file.`,
      confidence: 0,
    };
  }
}

export async function smartgpt_pro_answer({
  query,
  depth = 3,
}: {
  query: string;
  depth?: number;
}) {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        "[SmartGPT] No OPENAI_API_KEY found, returning simulated response"
      );

      // Generate a more detailed simulated response for Pro answers
      return {
        answer: `SmartGPT Pro simulation mode: This is a simulated response to your query: "${query}" at depth level ${depth}\n\nTo use real SmartGPT Pro capabilities with reasoning depth and source retrieval, please set up your OpenAI API key in the .env file.`,
        reasoning:
          "This is simulated reasoning output that would normally show multiple drafts and reasoning steps.",
        sources: ["Simulated source 1", "Simulated source 2"],
        confidence: 0.5,
      };
    }

    // Initialize SmartGPT with advanced configuration
    const smartGPT = new SmartGPT({
      apiKey: process.env.OPENAI_API_KEY || "",
      contextModel: "gpt-4.1",
      reasoningModel: "o4-mini",
      deep: true,
      serperApiKey: process.env.SERPER_API_KEY || "",
      // Add advanced options within supported parameters
    });

    // Set up real embedding function using OpenAI
    const embedFunction = async (text: string): Promise<Float32Array> => {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });

        // Convert the embedding data to Float32Array
        const embedding = response.data[0].embedding;
        return new Float32Array(embedding);
      } catch (error) {
        console.error("Error generating embeddings:", error);
        // Fallback to a simple embedding if OpenAI API fails
        return new Float32Array(new Array(1536).fill(0.1));
      }
    };

    // Set up memory store with embeddings dimension
    const memoryStore = new MemoryStore(1536);

    // Create the retriever for enhanced search
    const retriever = new FallbackRetriever(memoryStore, embedFunction);

    // Store query and related concepts in memory for future reference
    await memoryStore.add(query, embedFunction);

    // First, perform a web search to gather real-time information (if available)
    const webResults: WebResult[] = [];
    try {
      if (typeof smartGPT.webSearch === "function") {
        const searchResponse = await smartGPT.webSearch(query);

        // Safely process search results with appropriate type checking
        if (Array.isArray(searchResponse)) {
          for (const result of searchResponse) {
            // Type guard to check if the result has the expected structure
            if (
              result &&
              typeof result === "object" &&
              result !== null &&
              typeof (result as any).title === "string" &&
              typeof (result as any).link === "string" &&
              typeof (result as any).snippet === "string"
            ) {
              webResults.push({
                title: (result as any).title,
                link: (result as any).link,
                snippet: (result as any).snippet,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Web search error:", error);
      // Continue without web results if search fails
    }

    // Format web results for context
    const webResultsText = webResults.map(
      (result) =>
        `Title: ${result.title}\nURL: ${result.link}\nSnippet: ${result.snippet}`
    );

    // Combine real-time web results with existing knowledge
    const knowledgeResults = await retriever.retrieve(query, 5);
    const combinedContext = [...webResultsText, ...knowledgeResults].join(
      "\n\n"
    );

    // Then run the thoughtChain with depth and context
    const enhancedQuery =
      combinedContext.length > 0
        ? `${query}\n\nRelevant context:\n${combinedContext}`
        : query;

    // Run the thoughtChain process
    const result = await smartGPT.thoughtChain(enhancedQuery, depth);

    // Define proper source types
    type WebSource = { title: string; url: string; type: "web" };
    type KnowledgeSource = {
      title: string;
      excerpt: string;
      type: "knowledge";
    };
    type Source = WebSource | KnowledgeSource;

    // Process sources for citation
    const sources: Source[] = [
      ...webResults.map((result) => ({
        title: result.title,
        url: result.link,
        type: "web" as const,
      })),
      ...knowledgeResults.map((text, i) => ({
        title: `Knowledge Base Reference ${i + 1}`,
        excerpt: text.substring(0, 100) + "...",
        type: "knowledge" as const,
      })),
    ];

    // Store the final answer in memory for future reference
    if (result.best) {
      await memoryStore.add(result.best, embedFunction);
    }

    // Format sources for the output
    const formattedSources = sources.map((source) => {
      if (source.type === "web") {
        return `${source.title} (${source.url})`;
      } else {
        return source.excerpt;
      }
    });

    return {
      answer: result.best || "",
      reasoning: result.drafts ? result.drafts.join("\n\n") : "",
      sources: formattedSources,
      confidence: 0.95,
    };
  } catch (error: any) {
    console.error("[SmartGPT] Error in smartgpt_pro_answer:", error);
    return {
      answer: `Error processing your pro query: ${
        error.message || "Unknown error"
      }.\n\nPlease check your API configuration in the .env file.`,
      reasoning: "",
      sources: [],
      confidence: 0,
    };
  }
}

// Export AZR tool
export { absolute_zero_reasoner } from "./azr.js";

// File system tools
export { read_csv, read_json, read_markdown, read_pdf } from "./filesystem.js";

// MacOS sandboxed shell tool
export { macos_shell } from "./sandbox.js";

// AI model provider tools
export {
  openai_completion,
  anthropic_completion,
  google_gemini,
  groq_completion,
} from "./models.js";

// Web search tool
export { web_search } from "./web_search.js";

// Re-export config
export { toolsConfig };

// Tool JSON schema for SmartGPT integration
export const TOOLS_JSON = JSON.stringify(
  toolsConfig.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.schema.input.shape).map(
          ([key, schema]: [string, any]) => [
            key,
            {
              type: schema._def.typeName === "ZodNumber" ? "number" : "string",
              description: schema.description,
            },
          ]
        )
      ),
      required: Object.keys(tool.schema.input.shape).filter(
        (key) =>
          !(tool.schema.input.shape as Record<string, any>)[key].isOptional()
      ),
    },
    returns: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.schema.output.shape).map(
          ([key, schema]: [string, any]) => [
            key,
            {
              type:
                schema._def.typeName === "ZodNumber"
                  ? "number"
                  : schema._def.typeName === "ZodArray"
                  ? "array"
                  : "string",
              description: schema.description,
            },
          ]
        )
      ),
    },
  })),
  null,
  2
);
