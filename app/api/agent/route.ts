import {NextResponse} from "next/server";
import {sql,ensureSchema} from "@/lib/db";

const relationTypes=["related","follows_from","helps_explain","branch_of","contrasts_with"] as const;

export async function GET(req:Request){
  await ensureSchema();
  const u=new URL(req.url);
  const raw=u.searchParams.get("payload");
  let p:any;
  try{p=raw?JSON.parse(raw):Object.fromEntries(u.searchParams.entries())}
  catch{return NextResponse.json({ok:false,error:"invalid payload"},{status:400})}
  const op=p.op||"list";
  try{
    if(op==="create"){
      const r=await sql("INSERT INTO wonders(question) VALUES($1) RETURNING *",[p.question]);
      return NextResponse.json({ok:true,wonder:r[0]});
    }
    if(op==="append"){
      const r=await sql("INSERT INTO wonder_entries(wonder_id,content) VALUES($1,$2) RETURNING *",[p.wonder_id,p.content]);
      await sql("UPDATE wonders SET updated_at=NOW(),status='investigating' WHERE id=$1",[p.wonder_id]);
      return NextResponse.json({ok:true,entry:r[0]});
    }
    if(op==="get"){
      const w=await sql("SELECT * FROM wonders WHERE id=$1",[p.wonder_id]);
      const e=await sql("SELECT * FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at",[p.wonder_id]);
      const related=await sql("SELECT w.id,w.question,w.status,l.relationship_type,l.reason,l.confidence,l.source FROM wonder_links l JOIN wonders w ON w.id=l.related_id WHERE l.wonder_id=$1 UNION SELECT w.id,w.question,w.status,l.relationship_type,l.reason,l.confidence,l.source FROM wonder_links l JOIN wonders w ON w.id=l.wonder_id WHERE l.related_id=$1 ORDER BY question",[p.wonder_id]);
      return NextResponse.json({ok:true,wonder:w[0]||null,entries:e,related});
    }
    if(op==="search"){
      const r=await sql("SELECT * FROM wonders WHERE question ILIKE $1 ORDER BY updated_at DESC LIMIT 50",["%"+(p.q||"")+"%"]);
      return NextResponse.json({ok:true,wonders:r});
    }
    if(op==="update"){
      const r=await sql("UPDATE wonders SET question=COALESCE(NULLIF($2,''),question),status=COALESCE($3,status),updated_at=NOW() WHERE id=$1 RETURNING *",[p.wonder_id,typeof p.question==="string"?p.question.trim():"",p.status||null]);
      return NextResponse.json({ok:true,wonder:r[0]});
    }
    if(op==="rabbit_holes"){
      const target=await sql("SELECT id,question,status FROM wonders WHERE id=$1",[p.wonder_id]);
      if(!target[0]) return NextResponse.json({ok:true,wonder:null,candidates:[]});
      const entries=await sql("SELECT content,created_at FROM wonder_entries WHERE wonder_id=$1 ORDER BY created_at DESC LIMIT 12",[p.wonder_id]);
      const candidates=await sql("SELECT w.id,w.question,w.status,w.created_at,w.updated_at,COALESCE((SELECT json_agg(e ORDER BY e.created_at DESC) FROM (SELECT content,created_at FROM wonder_entries WHERE wonder_id=w.id ORDER BY created_at DESC LIMIT 5) e),'[]'::json) AS entries FROM wonders w WHERE w.id<>$1 AND NOT EXISTS (SELECT 1 FROM wonder_links l WHERE (l.wonder_id=$1 AND l.related_id=w.id) OR (l.wonder_id=w.id AND l.related_id=$1)) ORDER BY w.updated_at DESC LIMIT $2",[p.wonder_id,Math.min(Number(p.limit)||12,30)]);
      return NextResponse.json({ok:true,wonder:target[0],entries,candidates});
    }
    if(op==="link"){
      const type=relationTypes.includes(p.relationship_type)?p.relationship_type:"related";
      const confidence=p.confidence===""||p.confidence==null?null:Number(p.confidence);
      if(confidence!==null&&(!Number.isFinite(confidence)||confidence<0||confidence>1)) return NextResponse.json({ok:false,error:"confidence must be between 0 and 1"},{status:400});
      await sql("INSERT INTO wonder_links(wonder_id,related_id,relationship_type,reason,confidence,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(wonder_id,related_id) DO UPDATE SET relationship_type=EXCLUDED.relationship_type,reason=EXCLUDED.reason,confidence=EXCLUDED.confidence,source=EXCLUDED.source",[p.wonder_id,p.related_id,type,p.reason||null,confidence,p.source||"manual"]);
      return NextResponse.json({ok:true,relationship_type:type,reason:p.reason||null,confidence,source:p.source||"manual"});
    }
    if(op==="unlink"){
      await sql("DELETE FROM wonder_links WHERE (wonder_id=$1 AND related_id=$2) OR (wonder_id=$2 AND related_id=$1)",[p.wonder_id,p.related_id]);
      return NextResponse.json({ok:true});
    }
    const r=await sql("SELECT id,question,status,created_at,updated_at FROM wonders ORDER BY updated_at DESC LIMIT 50");
    return NextResponse.json({ok:true,wonders:r});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"request failed"},{status:400})}
}
