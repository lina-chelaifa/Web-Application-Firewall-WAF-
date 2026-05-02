import { useState, useEffect } from "react";
import { fetchRules, createRule, updateRule, deleteRule } from "../api";

const CATS = ["SQLi","XSS","PathTraversal","CmdInjection","Scanner","Custom"];
const CAT_COLOR = { SQLi:"#ff6b35", XSS:"#ffd23f", PathTraversal:"#c77dff", CmdInjection:"#ff4d6d", Scanner:"#4cc9f0", Custom:"#94a3b8" };
const EMPTY = { name:"", description:"", pattern:"", category:"Custom", score:5, scope:"all" };

export default function Rules() {
  const [rules,  setRules]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [form,   setForm]   = useState(EMPTY);
  const [show,   setShow]   = useState(false);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const r = await fetchRules(); setRules(r.data); } catch(_) {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(rule) { await updateRule(rule.id,{ enabled: rule.enabled?0:1 }); load(); }
  async function del(id) { if (!window.confirm("Delete this rule permanently?")) return; await deleteRule(id); load(); }
  async function add(e) {
    e.preventDefault(); setError(""); setSaving(true);
    try { await createRule({...form, score:parseInt(form.score)}); setForm(EMPTY); setShow(false); load(); }
    catch(err) { setError(err.response?.data?.error||"Failed to create rule"); }
    finally { setSaving(false); }
  }

  const enabled  = rules.filter(r=>r.enabled).length;
  const disabled = rules.filter(r=>!r.enabled).length;

  return (
    <div style={{ fontFamily:"'DM Mono','Fira Code',monospace" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <p style={{ color:"#4cc9f0", fontSize:10, letterSpacing:4, textTransform:"uppercase", margin:"0 0 6px" }}>Detection Engine</p>
          <h1 style={{ fontSize:30, fontWeight:700, color:"#f0f6fc", margin:0, letterSpacing:-1 }}>Security Rules</h1>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ background:"rgba(56,239,125,0.08)", border:"1px solid rgba(56,239,125,0.2)", borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:700, color:"#38ef7d" }}>{enabled}</div>
            <div style={{ fontSize:9, color:"#64748b", letterSpacing:2, textTransform:"uppercase" }}>Active</div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:700, color:"#334155" }}>{disabled}</div>
            <div style={{ fontSize:9, color:"#334155", letterSpacing:2, textTransform:"uppercase" }}>Disabled</div>
          </div>
          <button onClick={() => setShow(v=>!v)} style={{ padding:"9px 20px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", background: show?"rgba(255,77,109,0.15)":"#4cc9f0", color: show?"#ff4d6d":"#0d1117", border: show?"1px solid rgba(255,77,109,0.4)":"none" }}>
            {show ? "✕ Cancel" : "+ Add Rule"}
          </button>
        </div>
      </div>

      {/* Add rule form */}
      {show && (
        <form onSubmit={add} style={{ background:"rgba(76,201,240,0.04)", border:"1px solid rgba(76,201,240,0.2)", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#4cc9f0", marginBottom:16 }}>New Security Rule</div>
          {error && <div style={{ color:"#ff4d6d", fontSize:12, marginBottom:12 }}>{error}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            {[["Rule Name *","name","e.g. XSS_NEW_VECTOR","text"],["Score (1-10)","score","5","number"]].map(([lbl,key,ph,type])=>(
              <div key={key}>
                <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>{lbl}</div>
                <input required type={type} min={type==="number"?1:undefined} max={type==="number"?10:undefined}
                  value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                  placeholder={ph}
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:12, fontFamily:"monospace", boxSizing:"border-box", outline:"none" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Description *</div>
            <input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What does this rule detect?"
              style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:12, boxSizing:"border-box", outline:"none" }} />
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Regex Pattern *</div>
            <input required value={form.pattern} onChange={e=>setForm({...form,pattern:e.target.value})} placeholder="e.g. (?i)(<script[\s>])"
              style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#38ef7d", fontSize:12, fontFamily:"monospace", boxSizing:"border-box", outline:"none" }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            {[["Category","category",CATS],["Scope","scope",["all","path","headers","body"]]].map(([lbl,key,opts])=>(
              <div key={key}>
                <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>{lbl}</div>
                <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                  style={{ width:"100%", background:"#0d1117", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:12, outline:"none" }}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{ padding:"9px 24px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", background:"#38ef7d", color:"#0d1117", border:"none", opacity:saving?0.6:1 }}>
            {saving?"Saving…":"Create Rule"}
          </button>
        </form>
      )}

      {/* Rules table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"70px 180px 110px 1fr 80px 60px 70px", padding:"9px 20px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:9, letterSpacing:3, textTransform:"uppercase", color:"#334155", fontWeight:700 }}>
          {["Status","Name","Category","Description","Scope","Score",""].map(h=><span key={h}>{h}</span>)}
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:"50px 0", color:"#334155" }}>Loading…</div>
        ) : rules.map((rule,i) => {
          const col = CAT_COLOR[rule.category] || "#94a3b8";
          return (
            <div key={rule.id} style={{ display:"grid", gridTemplateColumns:"70px 180px 110px 1fr 80px 60px 70px", padding:"11px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)", alignItems:"center", fontSize:11, background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
              <div>
                <button onClick={()=>toggle(rule)} style={{ fontSize:9, fontWeight:700, padding:"3px 10px", borderRadius:6, cursor:"pointer", letterSpacing:1,
                  background: rule.enabled?"rgba(56,239,125,0.12)":"rgba(255,255,255,0.04)",
                  color:      rule.enabled?"#38ef7d":"#334155",
                  border:     rule.enabled?"1px solid rgba(56,239,125,0.3)":"1px solid rgba(255,255,255,0.06)" }}>
                  {rule.enabled?"ON":"OFF"}
                </button>
              </div>
              <div style={{ fontFamily:"monospace", color:"#64748b", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={rule.name}>{rule.name}</div>
              <div>
                <span style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:6, background:`${col}18`, color:col, border:`1px solid ${col}40` }}>{rule.category}</span>
              </div>
              <div style={{ color:"#475569", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rule.description}</div>
              <div style={{ color:"#334155", fontSize:10 }}>{rule.scope}</div>
              <div style={{ textAlign:"center", fontWeight:700, color: rule.score>=5?"#ff4d6d":"#ffd23f", fontSize:14 }}>{rule.score}</div>
              <div>
                <button onClick={()=>del(rule.id)} style={{ fontSize:10, padding:"3px 10px", borderRadius:6, cursor:"pointer", background:"rgba(255,77,109,0.08)", color:"#ff4d6d", border:"1px solid rgba(255,77,109,0.2)" }}>Del</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}