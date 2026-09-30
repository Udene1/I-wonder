import {NextResponse} from "next/server";
import {sql,ensureSchema} from "@/lib/db";

export async function GET(){
  await ensureSchema();
  const wonders=await sql("SELECT id,question,status,created_at,updated_at FROM wonders ORDER BY updated_at DESC");
  const links=await sql("SELECT wonder_id,related_id,relationship_type,reason,confidence,source FROM wonder_links ORDER BY created_at");
  return NextResponse.json({wonders,links});
}

export async function POST(req:Request){
  await ensureSchema();
  const b=await req.json();
  if(!b.question?.trim())return NextResponse.json({error:"question required"},{status:400});
  const r=await sql("INSERT INTO wonders(question) VALUES($1) RETURNING *",[b.question.trim()]);
  return NextResponse.json({wonder:r[0]},{status:201});
}
