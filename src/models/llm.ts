import { OpenAI } from "openai";
import { generateText } from "ai";
import { z } from "zod";

import { ChatMsg } from "../core/types.js";
import { inferProvider, providerFor } from "./providers.js";

const TEMPS = {
  openai: { gpt4: 0, gpt35: 0, default: 0 },
  google: { default: 0.2 },
};

export interface RawCallOptions {
  model: string;
  messages: ChatMsg[];
  func?: any[];
  schema?: z.ZodType<any>;
  temperature?: number;
  maxTokens?: number;
  api?: OpenAI;
}

export const rawCall = async (
  options: RawCallOptions
): Promise<string | any> => {
  try {
    const { model, messages, temperature, api, maxTokens, schema } = options;

    if (api) {
      const t = temperature ?? (model.includes("gpt-4") ? 0 : 0.7);
      const { choices } = await api.chat.completions.create({
        model,
        messages: messages as any[],
        temperature: t,
        max_tokens: maxTokens,
        tools: options.func
          ? options.func.map((fn) => ({
              type: "function" as const,
              function: fn,
            }))
          : undefined,
        response_format: schema ? { type: "json_object" } : undefined,
      });
      const content = choices[0].message.content ?? "";
      return schema ? schema.parse(JSON.parse(content)) : content;
    } else {
      const provider = inferProvider(model);
      const temp =
        temperature ??
        (model.includes("gpt-4")
          ? TEMPS.openai.gpt4
          : model.includes("gpt-3.5")
          ? TEMPS.openai.gpt35
          : provider === "openai"
          ? TEMPS.openai.default
          : TEMPS.google.default);

      const { text } = await generateText({
        model: providerFor(model),
        messages,
        temperature: temp,
        maxTokens,
      });
      return text;
    }
  } catch (e) {
    console.error("Error in rawCall:", e);
    throw e;
  }
};

export const callStructured = async <T>(
  model: string,
  prompt: string,
  schema: z.ZodType<T>,
  temperature?: number,
  api?: OpenAI
): Promise<T> => {
  const result = await rawCall({
    model,
    messages: [{ role: "user", content: prompt }],
    schema,
    temperature,
    api,
  });
  return result as T;
};
