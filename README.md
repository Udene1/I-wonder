# I Wonder…

A calm curiosity journal. No AI lives inside the product. ChatGPT, Claude and other model surfaces can operate the same durable store through MCP or the agent-facing GET API.

Stack: Next.js, Vercel, Neon Postgres.

Agent API examples:
- `/api/agent?op=list`
- `/api/agent?op=create&question=...`
- `/api/agent?op=search&q=...`
- `/api/agent?op=get&wonder_id=...`
- `/api/agent?op=append&wonder_id=...&content=...`

MCP will expose the same operations without duplicating business logic.