# I Wonder — Agent Tool Guide

I Wonder is Kenneth's private, single-user curiosity journal. It stores questions, durable discoveries, statuses, and explicit rabbit-hole relationships.

The application itself does **not** call an AI provider. An external agent such as ChatGPT can use the agent-facing API or MCP to inspect the journal, reason over it, and write durable results back.

## Agent-facing HTTP API

Base path:

`GET /api/agent`

The API accepts ordinary query parameters or one URL-encoded `payload` JSON object.

### List curiosities

```
/api/agent?op=list
```

Returns recent curiosities:

```json
{
  "ok": true,
  "wonders": [
    {
      "id": "...",
      "question": "...",
      "status": "curious",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Use this first when you need to understand what Kenneth has been wondering about.

### Create a curiosity

```
/api/agent?op=create&question=Why%20does%20...
```

Creates a new curiosity with status `curious`.

### Get one curiosity

```
/api/agent?op=get&wonder_id=<UUID>
```

Returns the curiosity, its complete discovery/ thought history, and its rabbit-hole relationships.

Use this before making a judgment about an existing curiosity. The question alone may not contain the context; entries are part of the durable record.

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

Use this when Kenneth has learned something, noticed something important, or wants a thought preserved in the thread.

### Edit a curiosity's question

The wording of a question is editable without creating a new curiosity.

```
/api/agent?op=update&wonder_id=<UUID>&question=<new question>
```

The same `update` operation can also change status:

```
/api/agent?op=update&wonder_id=<UUID>&status=learned
```

Both can be supplied together. Editing the question preserves the curiosity's ID, discovery history, and relationships.

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

`/api/mcp`

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

## Recommended agent workflow

When asked to help with I Wonder:

1. **Read before writing.** Start with `list_wonders` or `search_wonders`.
2. **Open the relevant curiosity.** Use `get_wonder` so the question and its discovery history are both available.
3. **Preserve identity.** If the wording of a question was simply mistyped or incomplete, use `edit_wonder` / `op=update` rather than creating a replacement curiosity.
4. **Record durable discoveries.** Use `append_to_wonder` for information that should remain part of the curiosity's thread.
5. **Use rabbit holes deliberately.** Call `find_rabbit_holes`, reason over the candidates using the actual question and entries, and only then call `link_wonders`.
6. **Explain relationships.** When creating a link, provide a short `reason` and a `confidence` when appropriate.
7. **Do not manufacture structure.** Shared vocabulary is not sufficient evidence of a relationship.
8. **Keep the journal personal.** I Wonder is a private curiosity garden, not a team knowledge base or generic task-management system.

## Payload form

For agents that prefer one encoded JSON argument, all HTTP operations also accept:

```
/api/agent?payload=<URL-encoded JSON>
```

Example payload:

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

The question is the identity-bearing object. Correcting its wording should normally be an edit, not a new record.
