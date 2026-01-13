/**
 * OpenCode plugin to omit max_output_tokens/max_tokens from API requests.
 *
 * Configuration in opencode.json:
 *
 * {
 *   "provider": {
 *     "my-provider": {
 *       "npm": "@ai-sdk/openai",
 *       "api": "https://your-api.com/v1",
 *       "env": ["MY_API_KEY"],
 *       "options": {
 *         "addInstruction": true
 *       },
 *       "models": { "gpt-4o": {} }
 *     }
 *   }
 * }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

let addInstruction = false;

/** @type {Map<string, string | null>} */
const instructionCache = new Map();

function toSafeFilenameKey(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toUnderscoreKey(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function loadInstructionForModel(model) {
  if (typeof model !== "string") return null;

  const modelLower = model.toLowerCase().trim();
  if (modelLower === "") return null;

  if (instructionCache.has(modelLower)) {
    return instructionCache.get(modelLower);
  }

  const safeKey = toSafeFilenameKey(modelLower);
  const underscoreKey = toUnderscoreKey(modelLower);

  const candidateFilenames = [];
  if (safeKey) candidateFilenames.push(`${safeKey}_prompt.md`);
  if (underscoreKey && underscoreKey !== safeKey) {
    candidateFilenames.push(`${underscoreKey}_prompt.md`);
  }

  for (const filename of candidateFilenames) {
    try {
      const text = await readFile(path.join(pluginDir, filename), "utf8");
      instructionCache.set(modelLower, text);
      return text;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
    }
  }

  instructionCache.set(modelLower, null);
  return null;
}

const originalFetch = globalThis.fetch;

if (typeof originalFetch === "function") {
  globalThis.fetch = async function patchedFetch(input, init) {
    if (!addInstruction) {
      return originalFetch.call(this, input, init);
    }

    const body = init?.body;
    if (typeof body !== "string") {
      return originalFetch.call(this, input, init);
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return originalFetch.call(this, input, init);
    }

    if (!parsed || typeof parsed !== "object") {
      return originalFetch.call(this, input, init);
    }

    const model = typeof parsed.model === "string" ? parsed.model : "";
    const modelLower = model.toLowerCase();

    if (modelLower.includes("gpt")) {
      if ("max_output_tokens" in parsed) delete parsed.max_output_tokens;
      if ("max_tokens" in parsed) delete parsed.max_tokens;
    }

    // 根据模型不同 使用不同的提示词
    const instructions = await loadInstructionForModel(model);
    if (instructions !== null) {
      parsed.instructions = instructions;
    }

    return originalFetch.call(this, input, { ...init, body: JSON.stringify(parsed) });
  };
}

/**
 * @type {import('@opencode-ai/plugin').Plugin}
 */
export async function OpenAIAddInstructionPlugin(_input) {
  return {
    "chat.params": async (input, _output) => {
      // input.provider might be a Promise
      let provider = input.provider;
      if (provider && typeof provider.then === "function") {
        provider = await provider;
      }
      addInstruction = provider?.options?.addInstruction === true;
    },
  };
}

export default OpenAIAddInstructionPlugin;
