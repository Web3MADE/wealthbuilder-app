# TODO

Do NOT implement anything in this TODO unless specified in the prompt.

## Refactor

- Evaluate replacing custom multi-model/provider routing with Vercel AI SDK while keeping `AIPlannerPort` / `AIChatPort` as the application boundary.
- Use AI SDK for structured output, streaming, and tool calling where it simplifies the agent layer.
- Keep OpenCode Go as the current working provider until the refactor is justified.
- Consider Vercel AI Gateway later for provider routing, fallbacks, auth, and observability.