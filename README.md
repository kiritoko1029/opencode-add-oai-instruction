# opencode-add-oai-instruction

[简体中文](README.zh-CN.md)

[OpenCode](https://github.com/anomalyco/opencode) plugin that injects an `instructions` string into OpenAI-compatible API requests.

The instructions are loaded from a Markdown file based on the request's `model`.

It also removes `max_output_tokens` / `max_tokens` for `gpt*` models (useful for some OpenAI-compatible providers that reject these fields).

## Installation

```bash
cd ~/.config/opencode
bun add github:kiritoko1029/opencode-add-oai-instruction
```

## Usage

Add to your `opencode.json`:

```jsonc
{
  "plugin": [
    "@kiritoko1029/opencode-add-oai-instruction" // Add this line
  ],
  "provider": {
    "my-provider": {
      "npm": "@ai-sdk/openai",
      "api": "https://your-api.com/v1",
      "env": ["MY_API_KEY"],
      "options": {
        "addInstruction": true // Enable the plugin
      },
      "models": {
        "gpt-5.2": {}
      }
    }
  }
}
```

## Prompt Files

This package ships with built-in prompt Markdown files (so you typically don't need to create anything).

Prompt source: https://github.com/openai/codex/tree/main/codex-rs/core

### Custom prompts (optional)

If you want to use your own prompt (override the built-in one, or add a prompt for another model), put a Markdown file in the same directory as this plugin's `index.mjs`.

File name format:

- `<model>_prompt.md`

Examples:

- `model="gpt-5.2-codex"` → `gpt-5.2-codex_prompt.md`
- `model="gpt-5.2"` → `gpt-5.2_prompt.md` (or `gpt_5_2_prompt.md`)

Notes:

- Matching is case-insensitive.
- If no matching file is found, the plugin falls back to a short built-in `instructions` (unless the request already includes a non-empty `instructions`).

## How It Works

1. Hooks into `chat.params` to read `provider.options.addInstruction`
2. Intercepts `globalThis.fetch` and (when enabled):
   - Removes `max_output_tokens` / `max_tokens` when `model` contains `gpt`
   - Loads `instructions` from the model-specific `_prompt.md` file
3. Caches the loaded instructions per model (in-memory)

## License

MIT
