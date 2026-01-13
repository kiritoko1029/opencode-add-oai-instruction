# opencode-add-oai-instruction

[English](README.md) | [简体中文](README.zh-CN.md)

[OpenCode](https://github.com/anomalyco/opencode) 插件：会向 OpenAI 兼容接口的请求体中注入 `instructions` 字段。

`instructions` 的内容会根据请求里的 `model` 从对应的 Markdown 文件加载。

另外，对于 `gpt*` 模型（`model` 包含 `gpt`），插件也会移除 `max_output_tokens` / `max_tokens`，用于兼容一些不支持这些字段的 OpenAI-compatible provider。

## 安装

```bash
cd ~/.config/opencode
bun add github:kiritoko1029/opencode-add-oai-instruction
```

## 使用

在你的 `opencode.json` 中加入：

```jsonc
{
  "plugins": [
    "@kiritoko1029/opencode-add-oai-instruction" // 添加这一行
  ],
  "provider": {
    "my-provider": {
      "npm": "@ai-sdk/openai",
      "api": "https://your-api.com/v1",
      "env": ["MY_API_KEY"],
      "options": {
        "addInstruction": true // 启用插件
      },
      "models": {
        "gpt-5.2": {}
      }
    }
  }
}
```

## 提示词文件（Prompt Files）

本包已内置提示词 Markdown 文件（通常不需要用户额外创建）。

提示词来源：https://github.com/openai/codex/tree/main/codex-rs/core

### 自定义提示词（可选）

如果你希望使用自己的提示词（覆盖内置提示词，或为其它 model 增加提示词），可以在插件目录（与 `index.mjs` 同级）放置/替换对应的 Markdown 文件。

文件命名规则：

- `<model>_prompt.md`

示例：

- `model="gpt-5.2-codex"` → `gpt-5.2-codex_prompt.md`
- `model="gpt-5.2"` → `gpt-5.2_prompt.md`（或 `gpt_5_2_prompt.md`）

说明：

- 匹配不区分大小写。
- 如果没有找到匹配的文件，插件会使用一段内置的简短 `instructions`（除非请求里已经包含非空的 `instructions`）。
- 读取到的提示词会按 `model` 做内存缓存（in-memory cache）。

## 工作原理

1. 在 `chat.params` hook 中读取 `provider.options.addInstruction`。
2. 拦截 `globalThis.fetch`，当插件启用时：
   - 当 `model` 包含 `gpt` 时，移除 `max_output_tokens` / `max_tokens`。
   - 根据 `model` 加载对应的 `_prompt.md` 文件内容，并写入请求体 `instructions`。
3. 对每个 `model` 的提示词内容进行缓存，减少文件读取次数。

## License

MIT
