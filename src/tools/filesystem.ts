import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  readCsvInput,
  readCsvOutput,
  readJsonInput,
  readJsonOutput,
  readMarkdownInput,
  readMarkdownOutput,
  readPdfInput,
  readPdfOutput,
} from "./config.js";

/**
 * Read and parse a CSV file
 */
export async function read_csv(
  params: z.infer<typeof readCsvInput>
): Promise<z.infer<typeof readCsvOutput>> {
  const { filePath } = params;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Basic CSV parsing - in production, consider using csv-parse or similar
    const lines = content
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
      return { data: [] };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Simple split by comma - won't handle quoted commas properly
      const cols = lines[i].split(",");
      const row: Record<string, any> = {};

      headers.forEach((h, j) => {
        // Try to parse numbers and booleans
        const value = cols[j]?.trim() ?? "";
        if (value === "") {
          row[h] = null;
        } else if (value.toLowerCase() === "true") {
          row[h] = true;
        } else if (value.toLowerCase() === "false") {
          row[h] = false;
        } else if (!isNaN(Number(value)) && value !== "") {
          row[h] = Number(value);
        } else {
          row[h] = value;
        }
      });

      rows.push(row);
    }

    return { data: rows };
  } catch (error) {
    throw new Error(
      `Error reading CSV file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Read and parse a JSON file
 */
export function read_json(
  params: z.infer<typeof readJsonInput>
): z.infer<typeof readJsonOutput> {
  const { filePath } = params;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(content);
    return { data: jsonData };
  } catch (error) {
    throw new Error(
      `Error reading JSON file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Read a Markdown file
 */
export function read_markdown(
  params: z.infer<typeof readMarkdownInput>
): z.infer<typeof readMarkdownOutput> {
  const { filePath } = params;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { content };
  } catch (error) {
    throw new Error(
      `Error reading Markdown file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Read and extract text from a PDF file
 * Requires pdf-parse package to be installed
 */
export async function read_pdf(
  params: z.infer<typeof readPdfInput>
): Promise<z.infer<typeof readPdfOutput>> {
  const { filePath } = params;

  try {
    // Check if pdf-parse is installed
    let pdfParse;
    try {
      pdfParse = await import("pdf-parse");
    } catch (err) {
      throw new Error(
        'pdf-parse package is not installed. Run "npm install pdf-parse" to use this tool.'
      );
    }

    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse.default(pdfBuffer);

    return { content: pdfData.text };
  } catch (error) {
    throw new Error(
      `Error reading PDF file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
