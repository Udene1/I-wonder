import { createMcpHandler } from "mcp-handler";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { sql, ensureSchema } from "@/lib/db";

const relationTypes = ["related","follows_from","helps_explain","branch_of","contrasts_with"] as const;

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
    const related = await sql("SELECT w.id,w.question,w.status,l.relationship_type,l.reason,l.confidence,l.source FROM wonder_links l JOIN wonders w ON w.id=l.related_id WHERE l.wonder_id=$1 UNION SELECT w.id,w.question,w.status,l.relationship_type,l.reason,l.confidence,l.source FROM wonder_links l JOIN wonders w ON w.id=l.wonder_id WHERE l.related_id=$1 ORDER BY question", [wonder_id]);
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

  server.registerTool("edit_wonder", {
    description: "Correct or refine the wording of a curiosity without changing its identity, history, status, or relationships.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), question: z.string().min(1) })
  }, async ({ wonder_id, question }) => {
    await ensureSchema();
    const rows = await sql("UPDATE wonders SET question=$2,updated_at=NOW() WHERE id=$1 RETURNING *", [wonder_id, question.trim()]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0] ?? null) }] };
  });

  server.registerTool("update_wonder", {
    description: "Change a curiosity's status.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), status: z.enum(["curious","investigating","learned","still_dont_know","forgotten"]) })
  }, async ({ wonder_id, status }) => {
    await ensureSchema();
    const rows = await sql("UPDATE wonders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *", [wonder_id, status]);
    return { content: [{ type: "text", text: JSON.stringify(rows[0] ?? null) }] };
  });

  server.registerTool("find_rabbit_holes", {
    description: "Prepare unlinked curiosities for semantic relationship reasoning. Do not infer a relationship merely from shared words.",
    inputSchema: z.object({ wonder_id: z.string().uuid(), limit: z.number().int().min(1).max(30).optional() })
  }, async ({ wonder_id, limit }) => {
    await ensureSchema();
    const target = await sql("SELECT id,question,status FROM wonders WHERE id=$1", [wonder_id]);
    if (!target[0]) return { content: [{ type: "text", text: JSON.stringify({ wonder: null, candidates: [] }) }] };
    const entries = await sql("SELECT content,created_at FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at DESC LIMIT 12", [wonder_id]);
    const candidates = await sql("SELECT w.id,w.question,w.status,w.created_at,w.updated_at,COALESCE((SELECT json_agg(e ORDER BY e.created_at DESC) FROM (SELECT content,created_at FROM wonder_entries WHERE wonder_id=w.id ORDER BY created_at DESC LIMIT 5) e),'[]'::json) AS entries FROM wonders w WHERE w.id<>$1 AND NOT EXISTS (SELECT 1 FROM wonder_links l WHERE (l.wonder_id=$1 AND l.related_id=w.id) OR (l.wonder_id=w.id AND l.related_id=$1)) ORDER BY w.updated_at DESC LIMIT $2", [wonder_id, limit ?? 12]);
    return { content: [{ type: "text", text: JSON.stringify({ wonder: target[0], entries, candidates }) }] };
  });

  server.registerTool("link_wonders", {
    description: "Connect two curiosities with an explicit semantic relationship.",
    inputSchema: z.object({
      wonder_id: z.string().uuid(),
      related_id: z.string().uuid(),
      relationship_type: z.enum(relationTypes).optional(),
      reason: z.string().max(500).optional(),
      confidence: z.number().min(0).max(1).optional(),
      source: z.enum(["manual","ai"]).optional()
    })
  }, async ({ wonder_id, related_id, relationship_type, reason, confidence, source }) => {
    await ensureSchema();
    const type = relationship_type ?? "related";
    const origin = source ?? "manual";
    await sql("INSERT INTO wonder_links(wonder_id,related_id,relationship_type,reason,confidence,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(wonder_id,related_id) DO UPDATE SET relationship_type=EXCLUDED.relationship_type,reason=EXCLUDED.reason,confidence=EXCLUDED.confidence,source=EXCLUDED.source", [wonder_id, related_id, type, reason ?? null, confidence ?? null, origin]);
    return { content: [{ type: "text", text: JSON.stringify({ linked: true, wonder_id, related_id, relationship_type: type, reason: reason ?? null, confidence: confidence ?? null, source: origin }) }] };
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