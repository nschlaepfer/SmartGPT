import fetch from "node-fetch";
import { z } from "zod";
import * as dotenv from "dotenv";
import { webSearchInput, webSearchOutput } from "./config.js";

// Load environment variables
dotenv.config();

// Define interface for Serper API response
interface SerperApiResponse {
  organic?: {
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
    displayedLink?: string;
  }[];
  [key: string]: any;
}

/**
 * Search the web using Serper API (Google Search Results)
 * @param {Object} params Search parameters
 * @param {string} params.query The search query
 * @param {number} params.numResults Optional number of results to return (default: 5)
 * @returns {Promise<Object>} Search results
 */
export async function web_search(
  params: z.infer<typeof webSearchInput>
): Promise<z.infer<typeof webSearchOutput>> {
  const { query, numResults = 5 } = params;
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not set in environment variables. Please add it to your .env file."
    );
  }

  console.log(`Searching the web for: "${query}"`);
  const startTime = Date.now();

  try {
    // Call Serper API (Google Search API)
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API returned status ${response.status}`);
    }

    const data = (await response.json()) as SerperApiResponse;
    const searchTime = (Date.now() - startTime) / 1000;

    // Extract and format the organic search results
    const results =
      data.organic?.map((result) => ({
        title: result.title || "",
        link: result.link || "",
        snippet: result.snippet || "",
        source: result.source || result.displayedLink || "",
      })) || [];

    // Limit to requested number of results
    const limitedResults = results.slice(0, numResults);

    return {
      results: limitedResults,
      searchTime,
    };
  } catch (error) {
    console.error("Error searching the web:", error);
    throw new Error(`Failed to search the web: ${(error as Error).message}`);
  }
}

export default web_search;
