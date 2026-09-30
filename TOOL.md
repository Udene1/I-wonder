# I Wonder — Agent Tool Guide

I Wonder is Kenneth's **private, single-user curiosity journal**. It stores questions, durable discoveries, statuses, and explicit rabbit-hole relationships. It is personal and is **not** a team knowledge base, SaaS product, task manager, or public knowledge base.

The application itself does **not** call an AI provider. An external agent such as ChatGPT can use the agent-facing API or MCP to inspect the journal, reason over it, and write durable results back.

## Production access

Production base URL:

`https://i-wonder-ashen.vercel.app`

Agent HTTP API:

`https://i-wonder-ashen.vercel.app/api/agent`

MCP endpoint:

`https://i-wonder-ashen.vercel.app/api/mcp`

The agent-facing HTTP API is intentionally **unauthenticated** because this is a private single-user application. Do not add or assume Vercel Authentication, accounts, tenants, or login are required for agent access.

The production `/api/agent` endpoint has been verified to return live data from Neon/Postgres.

## Agent-facing HTTP API

Base path:

`GET /api/agent`

The API accepts ordinary query parameters or one URL-encoded `payload` JSON object.

### List curiosities

```
/api/agent?op=list
```

Returns recent curiosities.

**Agent rule:** use this first when you need to understand Kenneth's current curiosity landscape.

### Create a curiosity

```
/api/agent?op=create&question=Why%20does%20...
```

Creates a new curiosity with status `curious`.

Before creating, search/list first so you do not duplicate an existing curiosity.

### Get one curiosity

```
/api/agent?op=get&wonder_id=<UUID>
```

Returns the curiosity, its complete discovery/thought history, and its rabbit-hole relationships.

**Important:** the question alone may not contain the context. Entries are part of the durable record. Read the existing curiosity before reasoning about or modifying it.

### Search curiosities

```
/api/agent?op=search&q=<text>
```

Searches question text using PostgreSQL `ILIKE`.

### Append a discovery or thought

```
/api/agent?op=append&wonder_id=<UUID>&content=<text>
```

Adds a durable entry and moves the curiosity to `investigating`.

Use this when Kenneth has learned something, noticed something important, or explicitly wants a thought preserved in the thread. Do not dump transient conversation into the journal unless it is durable.

### Edit a curiosity's question

The wording of a question is editable without creating a new curiosity.

```
/api/agent?op=update&wonder_id=<UUID>&question=<new question>
```

The same `update` operation can also change status:

```
/api/agent?op=update&wonder_id=<UUID>&status=learned
```

Both can be supplied together.

**Critical identity rule:** if Kenneth corrects a typo, wording, grammar, or phrasing in an existing question, **edit the existing record**. Do not create a replacement curiosity. Preserve its ID, discovery history, and relationships.

Valid statuses:

- `curious`
- `investigating`
- `learned`
- `still_dont_know`
- `forgotten`

### Find possible rabbit holes

```
/api/agent?op=rabbit_holes&wonder_id=<UUID>&limit=12
```

Returns the target curiosity, its recent entries, and unlinked candidate curiosities.

**Important:** this operation does not infer relationships. It only prepares material for an external agent to reason over.

An agent should inspect the target question and entries, compare them with candidates, and only create a relationship when there is a meaningful semantic connection.

### Link two curiosities

```
/api/agent?op=link&wonder_id=<UUID>&related_id=<UUID>&relationship_type=helps_explain&reason=<reason>&confidence=0.85&source=ai
```

Relationship types:

- `related`
- `follows_from`
- `helps_explain`
- `branch_of`
- `contrasts_with`

`source` can be `manual` or `ai`.

A relationship should have a concrete reason. Do not create links merely because two questions share words.

### Remove a relationship

```
/api/agent?op=unlink&wonder_id=<UUID>&related_id=<UUID>
```

The relationship is removed in either direction.

## MCP

I Wonder also exposes an MCP endpoint at:

`https://i-wonder-ashen.vercel.app/api/mcp`

Available tools:

- `list_wonders` — list recent curiosities.
- `create_wonder` — create a curiosity.
- `get_wonder` — retrieve a curiosity, its full history, and related curiosities.
- `search_wonders` — search curiosity questions.
- `append_to_wonder` — add a durable discovery/thought.
- `edit_wonder` — correct or refine a curiosity's question while preserving its identity and history.
- `update_wonder` — change status.
- `find_rabbit_holes` — prepare candidates for semantic relationship reasoning.
- `link_wonders` — persist an explicit semantic relationship.
- `unlink_wonders` — remove a relationship.

Prefer MCP when the connected agent environment exposes it. Otherwise use the production HTTP API directly.

## Recommended agent workflow

When asked to help with I Wonder:

1. **Read before writing.** Start with `list_wonders` or `search_wonders`.
2. **Open the relevant curiosity.** Use `get_wonder` so the question and its discovery history are both available.
3. **Preserve identity.** If Kenneth says a question should be corrected, rephrased, or fixed, edit the existing record with `edit_wonder` / `op=update`. Never create a duplicate merely because the wording changed.
4. **Record durable discoveries.** Use `append_to_wonder` for information that should remain part of the curiosity's thread.
5. **Use rabbit holes deliberately.** Call `find_rabbit_holes`, reason over candidates using the actual question and entries, and only then call `link_wonders`.
6. **Explain relationships.** When creating a link, provide a short concrete `reason` and a `confidence` when appropriate.
7. **Do not manufacture structure.** Shared vocabulary is not sufficient evidence of a relationship.
8. **Keep the journal personal.** Do not turn it into a generic productivity system or invent organizational structure Kenneth did not ask for.
9. **Verify writes.** After an important create/update/link operation, read the record again and confirm the persisted state.
10. **Do not claim success from a tool call alone.** A write should be considered complete only when the API response succeeds and, for important changes, a follow-up read confirms the stored value.

## Current live example

As of 2026-09-30, the journal contains this curiosity:

ID:
`4171f38f-1112-421f-8ff2-c31e1d617180`

Question:
> What are we doing on earth. And if we will die, why do we try to become whatever aside trying to eat.

Status: `curious`

This is an example of the identity-preservation rule: Kenneth corrected the wording from “What are doing on earth” to “What are we doing on earth,” and the existing record was edited rather than replaced.

## Payload form

For agents that prefer one encoded JSON argument, all HTTP operations also accept:

```
/api/agent?payload=<URL-encoded JSON>
```

Example:

```json
{
  "op": "update",
  "wonder_id": "00000000-0000-0000-0000-000000000000",
  "question": "Why does this happen?"
}
```

## Data model

- `wonders` — the durable question and current status.
- `wonder_entries` — chronological discoveries and thoughts belonging to a curiosity.
- `wonder_links` — explicit relationships between curiosities, including type, reason, confidence, and source.

The **question is the identity-bearing object**. Correcting its wording should normally be an edit, not a new record.
