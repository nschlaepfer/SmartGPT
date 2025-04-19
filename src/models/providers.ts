import { openai as vercelOpenAI } from "@ai-sdk/openai";
import { google as vercelGoogle } from "@ai-sdk/google";
import { ProviderKey } from "../core/types.js";

export const PROVIDERS = {
  openai: vercelOpenAI,
  google: vercelGoogle,
} as const;

export const inferProvider = (m: string): ProviderKey =>
  m.startsWith("gemini") ? "google" : "openai";

export const providerFor = (m: string) =>
  inferProvider(m) === "google"
    ? PROVIDERS.google(m, { useSearchGrounding: true })
    : PROVIDERS.openai(m);
