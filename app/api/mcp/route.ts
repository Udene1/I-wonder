import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { sql, ensureSchema } from "@/lib/db";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "i-wonder", version: "0.1.0" });

  server.registerTool("list_wonders", {
    description: "List recent curiosities.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).optional() })
  }, async ({ limit }) => {
    await ensureSchema();
    const rows = await sql("SELECT id,question,status,created_at,updated_at FROM wonders ORDER BY updated_at DESC LIMIT $1", [limit ?? 30]);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });

  server.registerTool("create_wonder", {
    description: "Create a new curiosity.",
    inputSchema: z.object({ question: z.string().min(1) })
  }, async ({ question }) => {
    await ensureSchema();
    const rows = await sql("INSERT INTO wonders(question) VALUES($1) RETURNING *", [question.trim()]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
  });

  server.registerTool("get_wonder", {
    description: "Get a curiosity and its complete append history.",
    inputSchema: z.object({ wonder_id: z.string().uuid() })
  }, async ({ wonder_id }) => {
    await ensureSchema();
    const w = await sql("SELECT * FROM wonders WHERE id=$1", [wonder_id]);
    const entries = await sql("SELECT * FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at", [wonder_id]);
    return { content: [{ type: "text", text: JSON.stringify({ wonder: w[0] ?? null, entries }) }] };
  });

  server.registerTool("search_wonders", {
    description: "Search curiosities by question text.",
    inputSchema: z.object({ query: z.string(), limit: z.number().int().min(1).max(100).optional() })
  }, async ({ query, limit }) => {
    await ensureSchema();
    const rows = await sql("SELECT * FROM wonders WHERE question ILIKE $1 ORDER BY updated_at DESC LIMIT $2", ["%" + query + "%", limit ?? 50]);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });

  server.registerTool("append_to_wonder", {
    description: "Append a durable note, discovery, or new thought to a curiosity.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), content: z.string().min(1) })
  }, async ({ wonder_id, content }) => {
    await ensureSchema();
    const rows = await sql("INSERT INTO wonder_entries(wonder_id,content) VALUES($1,$2) RETURNING *", [wonder_id, content.trim()]);
    await sql("UPDATE wonders SET updated_at=NOW(),status='investigating' WHERE id=$1", [wonder_id]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
  });

  server.registerTool("update_wonder", {
    description: "Change a curiosity's status.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), status: z.enum(["curious","investigating","learned","forgotten"]) })
  }, async ({ wonder_id, status }) => {
    await ensureSchema();
    const rows = await sql("UPDATE wonders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *", [wonder_id, status]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0] ?? null) }] };
  });

  return server;
});

export { handler as GET, handler as POST, handler as DELETE };