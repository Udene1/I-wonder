import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { sql, ensureSchema } from "@/lib/db";

const statuses = ["curious","investigating","learned","still_dont_know","forgotten"] as const;

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
    description: "Get a curiosity, its complete append history, and rabbit holes.",
    inputSchema: z.object({ wonder_id: z.string().uuid() })
  }, async ({ wonder_id }) => {
    await ensureSchema();
    const w = await sql("SELECT * FROM wonders WHERE id=$1", [wonder_id]);
    const entries = await sql("SELECT * FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at", [wonder_id]);
    const related = await sql("SELECT w.id,w.question,w.status FROM wonder_links l JOIN wonders w ON w.id=l.related_id WHERE l.wonder_id=$1 UNION SELECT w.id,w.question,w.status FROM wonder_links l JOIN wonders w ON w.id=l.wonder_id WHERE l.related_id=$1 ORDER BY question", [wonder_id]);
    return { content: [{ type: "text", text: JSON.stringify({ wonder: w[0] ?? null, entries, related }) }] };
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
    inputSchema: z.object({ wonder_id: z.string().uuid(), status: z.enum(statuses) })
  }, async ({ wonder_id, status }) => {
    await ensureSchema();
    const rows = await sql("UPDATE wonders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *", [wonder_id, status]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0] ?? null) }] };
  });

  server.registerTool("link_wonders", {
    description: "Connect two curiosities as a rabbit-hole relationship.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), related_id: z.string().uuid() })
  }, async ({ wonder_id, related_id }) => {
    await ensureSchema();
    await sql("INSERT INTO wonder_links(wonder_id,related_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [wonder_id, related_id]);
    return { content: [{ type: "text", text: JSON.stringify({ linked: true, wonder_id, related_id }) }] };
  });

  server.registerTool("unlink_wonders", {
    description: "Remove a rabbit-hole relationship between two curiosities.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), related_id: z.string().uuid() })
  }, async ({ wonder_id, related_id }) => {
    await ensureSchema();
    await sql("DELETE FROM wonder_links WHERE (wonder_id=$1 AND related_id=$2) OR (wonder_id=$2 AND related_id=$1)", [wonder_id, related_id]);
    return { content: [{ type: "text", text: JSON.stringify({ linked: false, wonder_id, related_id }) }] };
  });

  return server;
});

export { handler as GET, handler as POST };