'use client';
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,Check,Compass,Leaf,Plus,RefreshCw,Sparkles,Unlink} from "lucide-react";
type Entry={id:string;content:string;created_at:string};type Wonder={id:string;question:string;status:string;created_at:string;updated_at:string};type Related={id:string;question:string;status:string};
const statuses=["curious","investigating","learned","still_dont_know","forgotten"];
const glyphs=["✦","◌","☾","⌁","◇"];
function label(s:string){return s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
export default function WonderPage({params}:{params:Promise<{id:string}>}){
 const[w,setW]=useState<Wonder|null>(null),[entries,setEntries]=useState<Entry[]>([]),[related,setRelated]=useState<Related[]>([]),[all,setAll]=useState<Wonder[]>([]),[selected,setSelected]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[id,setId]=useState("");
 useEffect(()=>{params.then(p=>{setId(p.id);load(p.id);loadAll(p.id)})},[]);
 async function load(wid=id){if(!wid)return;const r=await fetch("/api/wonders/"+wid);const d=await r.json();setW(d.wonder||null);setEntries(d.entries||[]);setRelated(d.related||[])}
 async function loadAll(wid=id){const r=await fetch("/api/wonders");const d=await r.json();setAll((d.wonders||[]).filter((x:Wonder)=>x.id!==wid))}
 async function add(){if(!note.trim()||!id)return;setBusy(true);await fetch("/api/wonders/"+id+"/entries",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content:note})});setNote("");await load(id);setBusy(false)}
 async function status(s:string){if(!id)return;await fetch("/api/wonders/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:s})});load(id)}
 async function connect(){if(!selected||!id)return;setBusy(true);await fetch("/api/agent?op=link&wonder_id="+encodeURIComponent(id)+"&related_id="+encodeURIComponent(selected));setSelected("");await load(id);setBusy(false)}
 async function disconnect(relatedId:string){if(!id)return;setBusy(true);await fetch("/api/agent?op=unlink&wonder_id="+encodeURIComponent(id)+"&related_id="+encodeURIComponent(relatedId));await load(id);setBusy(false)}
 if(!w)return <main className="detail-shell"><Link href="/" className="back"><ArrowLeft size={16}/> Garden</Link><div className="empty"><Sparkles size={26}/><h3>Finding that question…</h3></div></main>;
 const choices=all.filter(x=>!related.some(r=>r.id===x.id));
 return <main className="detail-shell">
  <nav><Link href="/" className="back"><ArrowLeft size={16}/> Garden</Link><Link href="/?explore=1" className="back"><Compass size={15}/> Explore</Link></nav>
  <header className="detail-hero"><div className="detail-symbol">✦</div><small>{label(w.status)}</small><h1>{w.question}</h1><p>Started {new Date(w.created_at).toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}</p></header>
  <section className="status-row"><span>Where is this question now?</span><div>{statuses.map(s=><button className={w.status===s?"active":""} onClick={()=>status(s)} key={s}>{s==="learned"&&<Check size={13}/>} {label(s)}</button>)}</div></section>
  <section className="timeline-section"><div className="section-title"><div><small>THE THREAD</small><h2>Discoveries & thoughts</h2></div><span>{entries.length} {entries.length===1?"entry":"entries"}</span></div>
   <div className="timeline"><div className="timeline-line"/>{entries.map((e,i)=><article className="timeline-item" key={e.id}><div className="timeline-dot">{i===entries.length-1?<Sparkles size={11}/>:<Leaf size={11}/>}</div><div className="timeline-date">{new Date(e.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</div><div className="timeline-card"><p>{e.content}</p></div></article>)}{entries.length===0&&<div className="empty small"><Leaf size={24}/><p>No discoveries yet. Follow the thread when something occurs to you.</p></div>}</div>
   <div className="add-discovery"><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Something you discovered, noticed, or want to remember…"/><button onClick={add} disabled={busy||!note.trim()}>{busy?<RefreshCw className="spin" size={16}/>:<Plus size={16}/>} {busy?"Saving":"Add to the thread"}</button></div>
  </section>
  <section className="rabbit"><div className="section-title"><div><small>FOLLOW THE THREAD</small><h2>Rabbit holes</h2></div><span>{related.length} nearby</span></div>
   {related.length?<div className="related-grid">{related.map((r,i)=><div className="related-card" key={r.id}><Link href={"/wonder/"+r.id} className="related-link"><span>{glyphs[i%glyphs.length]}</span><div><small>{label(r.status)}</small><h3>{r.question}</h3></div><ArrowUpRight size={16}/></Link><button className="unlink" aria-label="Disconnect rabbit hole" onClick={()=>disconnect(r.id)} disabled={busy}><Unlink size={14}/></button></div>):<div className="rabbit-empty"><span>⌁</span><p>Related questions will gather here as your curiosity branches out.</p></div>}
   {choices.length>0&&<div className="connect-row"><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Connect another question…</option>{choices.map(x=><option key={x.id} value={x.id}>{x.question}</option>)}</select><button onClick={connect} disabled={busy||!selected}><Plus size={15}/> Connect</button></div>}
  </section>
 </main>
}