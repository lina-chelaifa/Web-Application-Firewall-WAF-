import { useState, useEffect } from "react";
import { fetchBlocklist, addToBlocklist, removeFromBlocklist } from "../api";

export default function Blocklist() {
  const [list,   setList]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [ip,     setIp]     = useState("");
  const [reason, setReason] = useState("");
  const [error,  setError]  = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    try { const r = await fetchBlocklist(); setList(r.data); } catch(_) {}
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  async function handleAdd(e) {
    e.preventDefault(); setError(""); setAdding(true);
    try { await addToBlocklist(ip.trim(), reason.trim()||"Manually blocked"); setIp(""); setReason(""); load(); }
    catch(err) { setError(err.response?.data?.error||"Failed to add IP"); }
    finally { setAdding(false); }
  }
  async function handleRemove(ipAddr) {
    if (!window.confirm(`Unblock ${ipAddr}?`)) return;
    await removeFromBlocklist(ipAddr); load();
  }

  return (
    <div style={{ fontFamily:"'DM Mono','Fira Code',monospace" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <p style={{ color:"#4cc9f0", fontSize:10, letterSpacing:4, textTransform:"uppercase", margin:"0 0 6px" }}>Access Control</p>
          <h1 style={{ fontSize:30, fontWeight:700, color:"#f0f6fc", margin:0, letterSpacing:-1 }}>IP Blocklist</h1>
        </div>
        <div style={{ background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:12, padding:"10px 20px", textAlign:"center" }}>
          <div style={{ fontSize:24, fontWeight:700, color:"#ff4d6d" }}>{list.length}</div>
          <div style={{ fontSize:9, color:"#64748b", letterSpacing:2, textTransform:"uppercase" }}>Blocked IPs</div>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ fontSize:10, color:"#475569", letterSpacing:3, textTransform:"uppercase", marginBottom:14 }}>Block an IP Address</div>
        {error && <div style={{ color:"#ff4d6d", fontSize:12, marginBottom:10 }}>{error}</div>}
        <div style={{ display:"flex", gap:12 }}>
          <input required value={ip} onChange={e=>setIp(e.target.value)} placeholder="192.168.1.100"
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 14px", color:"#ff4d6d", fontSize:13, fontFamily:"monospace", outline:"none" }} />
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)"
            style={{ flex:2, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 14px", color:"#e2e8f0", fontSize:12, outline:"none" }} />
          <button type="submit" disabled={adding} style={{ padding:"9px 24px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", background:"rgba(255,77,109,0.15)", color:"#ff4d6d", border:"1px solid rgba(255,77,109,0.4)", opacity:adding?0.6:1 }}>
            {adding?"Blocking…":"Block IP"}
          </button>
        </div>
      </form>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 160px 80px", padding:"9px 20px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:9, letterSpacing:3, textTransform:"uppercase", color:"#334155", fontWeight:700 }}>
          {["IP Address","Reason","Blocked Since","Action"].map(h=><span key={h}>{h}</span>)}
        </div>
        {loading ? (
          <div style={{ textAlign:"center", padding:"50px 0", color:"#334155" }}>Loading…</div>
        ) : list.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#334155" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
            No IPs currently blocked.
          </div>
        ) : list.map((item,i)=>(
          <div key={item.id} style={{ display:"grid", gridTemplateColumns:"160px 1fr 160px 80px", padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)", alignItems:"center", fontSize:11, background:i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
            <div style={{ fontFamily:"monospace", color:"#ff4d6d", fontWeight:700, fontSize:12 }}>{item.ip}</div>
            <div style={{ color:"#475569" }}>{item.reason||"—"}</div>
            <div style={{ color:"#334155", fontSize:10 }}>{new Date(item.added_at).toLocaleString()}</div>
            <div>
              <button onClick={()=>handleRemove(item.ip)} style={{ fontSize:10, padding:"3px 12px", borderRadius:6, cursor:"pointer", background:"rgba(56,239,125,0.08)", color:"#38ef7d", border:"1px solid rgba(56,239,125,0.2)" }}>Unblock</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}