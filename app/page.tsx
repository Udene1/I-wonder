'use client';
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,Compass,Leaf,Moon,Plus,Sparkles,Wind} from "lucide-react";
type Wonder={id:string;question:string;status:string;created_at:string;updated_at:string};
const glyphs=["✦","◌","☾","⌁","◇","✺"];
function label(s:string){return s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
export default function Home(){
 const[w,setW]=useState<Wonder[]>([]),[q,setQ]=useState(""),[open,setOpen]=useState(false),[explore,setExplore]=useState(false);
 async function load(){const r=await fetch("/api/wonders");const d=await r.json();setW(d.wonders||[])}
 useEffect(()=>{load()},[]);
 async function add(){if(!q.trim())return;await fetch("/api/wonders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:q})});setQ("");setOpen(false);load()}
 const learned=w.filter(x=>x.status==="learned").length;
 return <main className="shell">
  <header><Link className="brand" href="/"><span className="brand-orbit">✦</span><span>I wonder…</span></Link><button className="icon" aria-label="Quiet mode"><Moon size={17}/></button></header>
  <section className="hero"><div className="eyebrow"><Sparkles size={14}/> A quiet place for questions worth following.</div><h1>What are you<br/><em>curious about?</em></h1><p>You don't have to know where a question leads. Just keep the thread.</p><button className="wonder" onClick={()=>setOpen(true)}>Start wondering <span><ArrowUpRight size={18}/></span></button></section>
  <section className="garden">
   <div className="head"><div><small>YOUR CURIOSITY</small><h2>A little garden of questions</h2></div><div className="head-actions"><button className="explore-button" onClick={()=>setExplore(!explore)}><Compass size={15}/> {explore?"Garden":"Explore"}</button><button className="add" onClick={()=>setOpen(true)}><Plus size={16}/> Add</button></div></div>
   <div className="stats"><b>{w.length}</b> questions <span>·</span> <b>{learned}</b> learned</div>
   {explore?<div className="constellation">{w.length===0?<div className="empty"><Leaf size={26}/><h3>Your constellation is still quiet.</h3><p>Add a question and follow where it goes.</p></div>:<div className="orbit-scene">{w.map((x,i)=><Link key={x.id} href={"/wonder/"+x.id} className={"node node-"+(i%8)}><span>{glyphs[i%glyphs.length]}</span><strong>{x.question}</strong><small>{label(x.status)}</small></Link>)}<div className="constellation-center"><Sparkles size={18}/><span>your<br/>wondering</span></div></div>}</div>:w.length===0?<div className="empty"><div>✦</div><h3>Nothing here yet.</h3><p>The best questions usually arrive unexpectedly.</p></div>:<div className="list">{w.map((x,i)=><Link className="wonder-card" href={"/wonder/"+x.id} key={x.id}><div className="mark">{glyphs[i%glyphs.length]}</div><div className="card-copy"><small>{label(x.status)}</small><h3>{x.question}</h3><time>{new Date(x.updated_at||x.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</time></div><ArrowUpRight className="card-arrow" size={17}/></Link>)}</div>}
  </section>
  <footer><Wind size={14}/> A small place to follow your own curiosity.</footer>
  {open&&<div className="overlay" onMouseDown={()=>setOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><span>✦</span><h2>What crossed your mind?</h2><textarea autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Why do some songs feel faster than others?"/><div className="actions"><button onClick={()=>setOpen(false)}>Later</button><button onClick={add}>Keep wondering <ArrowUpRight size={16}/></button></div></div></div>}
 </main>
}