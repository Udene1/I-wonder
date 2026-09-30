import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { sql, ensureSchema } from "@/lib/db";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "i-wonder", version: "0.1.0" });
  server.registerTool("list_wonders", { description: "List recent curiosities.", inputSchema: { limit: z.number().int().min(1).max(100).optional() } }, async ({ limit }) => {
    await ensureSchema(); const rows = await sql("SELECT id,question,status,created_at,updated_at FROM wonders ORDER BY updated_at DESC LIMIT $1", [limit || 30]);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  });
  server.registerTool("create_wonder", { description: "Create a new curiosity.", inputSchema: { question: z.string().min(1) } }, async ({ question }) => {
    await ensureSchema(); const rows = await sql("INSERT INTO wonders(question) VALUES($1) RETURNING *", [question.trim()]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
  });
  server.registerTool("append_to_wonder", { description: "Append a durable note or discovery to a curiosity.", inputSchema: { wonder_id: z.string(), content: z.string().min(1) } }, async ({ wonder_id, content }) => {
    await ensureSchema(); const rows = await sql("INSERT INTO wonder_entries(wonder_id,content) VALUES($1,$2) RETURNING *", [wonder_id, content.trim()]); await sql("UPDATE wonders SET updated_at=NOW(),status='investigating' WHERE id=$1", [wonder_id]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0]) }] };
  });
  server.registerTool("get_wonder", { description: "Get a curiosity and its complete append history.", inputSchema: { wonder_id: z.string() } }, async ({ wonder_id }) => {
    await ensureSchema(); const w = await sql("SELECT * FROM wonders WHERE id=$1", [wonder_id]); const e = await sql("SELECT * FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at", [wonder_id]);
    return { content: [{ type: "text", text: JSON.stringify({ wonder: w[0] || null, entries: e }) }] };
  });
  return server;
});
export { handler as GET, handler as POST, handler as DELETE };