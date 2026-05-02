import { useState, useEffect, useCallback } from "react";
import { fetchEvents } from "../api";

const RULE_META = {
  SQLi:          { label: "SQL Injection",  color: "#ff6b35", bg: "rgba(255,107,53,0.12)"  },
  XSS:           { label: "XSS Attack",     color: "#ffd23f", bg: "rgba(255,210,63,0.12)"  },
  PathTraversal: { label: "Path Traversal", color: "#c77dff", bg: "rgba(199,125,255,0.12)" },
  CmdInjection:  { label: "Cmd Injection",  color: "#ff4d6d", bg: "rgba(255,77,109,0.12)"  },
  Scanner:       { label: "Scanner",        color: "#4cc9f0", bg: "rgba(76,201,240,0.12)"  },
  IP_FILTER:     { label: "IP Blocked",     color: "#f72585", bg: "rgba(247,37,133,0.12)"  },
};

function getRuleMeta(ruleName) {
  if (!ruleName) return null;
  for (const [key, val] of Object.entries(RULE_META)) {
    if (ruleName.startsWith(key) || ruleName.includes(key)) return val;
  }
  return { label: ruleName, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
}

function fmt(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total,  setTotal]  = useState(0);
  const [page,   setPage]   = useState(1);
  const [filter, setFilter] = useState("");
  const [loading,setLoading]= useState(false);
  const [auto,   setAuto]   = useState(true);
  const [newIds, setNewIds] = useState(new Set());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchEvents(page, filter);
      const incoming = res.data.events;
      if (silent) {
        setEvents(prev => {
          const prevIds = new Set(prev.map(e => e.id));
          const fresh = incoming.filter(e => !prevIds.has(e.id));
          if (fresh.length) setNewIds(new Set(fresh.map(e => e.id)));
          return incoming;
        });
      } else setEvents(incoming);
      setTotal(res.data.total);
    } catch (_) {}
    finally { if (!silent) setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => { if (!auto) return; const t = setInterval(() => load(true), 4000); return () => clearInterval(t); }, [load, auto]);
  useEffect(() => { if (!newIds.size) return; const t = setTimeout(() => setNewIds(new Set()), 2500); return () => clearTimeout(t); }, [newIds]);

  const blocked = events.filter(e => e.action === "BLOCK").length;
  const allowed = events.filter(e => e.action === "ALLOW").length;

  const COL = "90px 130px 64px 1fr 160px 66px 90px";

  return (
    <div style={{ fontFamily: "'DM Mono','Fira Code',monospace" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <p style={{ color:"#4cc9f0", fontSize:10, letterSpacing:4, textTransform:"uppercase", margin:"0 0 6px" }}>Real-time Audit Log</p>
          <h1 style={{ fontSize:30, fontWeight:700, color:"#f0f6fc", margin:0, letterSpacing:-1 }}>Live Events</h1>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {[["Total", total, "#4cc9f0","rgba(76,201,240,0.1)","rgba(76,201,240,0.3)"],
            ["Blocked", blocked,"#ff4d6d","rgba(255,77,109,0.1)","rgba(255,77,109,0.3)"],
            ["Allowed", allowed,"#38ef7d","rgba(56,239,125,0.1)","rgba(56,239,125,0.3)"]
          ].map(([lbl,val,col,bg,bdr]) => (
            <div key={lbl} style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12, padding:"10px 20px", textAlign:"center", minWidth:80 }}>
              <div style={{ fontSize:24, fontWeight:700, color:col }}>{val.toLocaleString()}</div>
              <div style={{ fontSize:9, color:"#64748b", letterSpacing:2, textTransform:"uppercase" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
        {[["","All Events"],["BLOCK","🚫 Blocked"],["ALLOW","✅ Allowed"]].map(([val,lbl]) => (
          <button key={val} onClick={() => { setFilter(val); setPage(1); }} style={{
            padding:"6px 16px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer",
            background: filter===val ? "#4cc9f0" : "rgba(255,255,255,0.04)",
            color:      filter===val ? "#0d1117" : "#64748b",
            border:     filter===val ? "1px solid #4cc9f0" : "1px solid rgba(255,255,255,0.07)",
            transition:"all .2s",
          }}>{lbl}</button>
        ))}
        <div style={{ flex:1 }} />
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:"#64748b", fontSize:11 }}>
          <div onClick={() => setAuto(v=>!v)} style={{ width:34, height:18, borderRadius:9, background: auto?"#4cc9f0":"rgba(255,255,255,0.08)", position:"relative", cursor:"pointer", transition:"background .3s" }}>
            <div style={{ position:"absolute", top:2, left: auto?16:2, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left .3s" }} />
          </div>
          Live feed
        </label>
        <button onClick={() => load(false)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:11 }}>↻ Refresh</button>
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, overflow:"hidden" }}>
        {/* Header row */}
        <div style={{ display:"grid", gridTemplateColumns:COL, padding:"9px 20px", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:9, letterSpacing:3, textTransform:"uppercase", color:"#334155", fontWeight:700 }}>
          {["Time","Source IP","Method","Path","Rule","Score","Decision"].map((h,i) => (
            <span key={h} style={{ textAlign: i>=5?"center":"left" }}>{h}</span>
          ))}
        </div>

        {/* Body */}
        {loading && !events.length ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#334155" }}>Loading…</div>
        ) : !events.length ? (
          <div style={{ textAlign:"center", padding:"64px 0", color:"#334155" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🛡️</div>
            <div>No events yet — send traffic through port 8080</div>
          </div>
        ) : events.map((ev) => {
          const meta    = getRuleMeta(ev.rule_name);
          const isBlock = ev.action === "BLOCK";
          const isNew   = newIds.has(ev.id);
          return (
            <div key={ev.id} style={{
              display:"grid", gridTemplateColumns:COL,
              padding:"10px 20px",
              borderBottom:"1px solid rgba(255,255,255,0.04)",
              alignItems:"center", fontSize:11,
              background: isNew ? "rgba(76,201,240,0.06)" : isBlock ? "rgba(255,77,109,0.025)" : "transparent",
              borderLeft: `2px solid ${isNew ? "#4cc9f0" : isBlock ? "rgba(255,77,109,0.5)" : "transparent"}`,
              transition:"background .8s",
            }}>
              <div>
                <div style={{ color:"#e2e8f0", fontSize:11 }}>{fmt(ev.timestamp)}</div>
                <div style={{ color:"#334155", fontSize:9 }}>{fmtDate(ev.timestamp)}</div>
              </div>
              <div style={{ color:"#64748b", fontFamily:"monospace", fontSize:11 }}>{ev.source_ip}</div>
              <div>
                <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4,
                  background: ev.method==="POST"?"rgba(199,125,255,0.15)":"rgba(76,201,240,0.08)",
                  color:      ev.method==="POST"?"#c77dff":"#4cc9f0",
                  border:`1px solid ${ev.method==="POST"?"rgba(199,125,255,0.25)":"rgba(76,201,240,0.2)"}`,
                }}>{ev.method}</span>
              </div>
              <div style={{ color:"#475569", fontFamily:"monospace", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:12 }} title={ev.path}>{ev.path}</div>
              <div>
                {meta ? (
                  <span style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:6, background:meta.bg, color:meta.color, border:`1px solid ${meta.color}40` }}>{meta.label}</span>
                ) : <span style={{ color:"#1e293b" }}>—</span>}
              </div>
              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:14, fontWeight:700, color: ev.score>=5?"#ff4d6d":ev.score>0?"#ffd23f":"#38ef7d" }}>{ev.score}</span>
              </div>
              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:9, fontWeight:700, padding:"3px 10px", borderRadius:6, letterSpacing:1,
                  background: isBlock?"rgba(255,77,109,0.15)":"rgba(56,239,125,0.1)",
                  color:      isBlock?"#ff4d6d":"#38ef7d",
                  border:     `1px solid ${isBlock?"rgba(255,77,109,0.35)":"rgba(56,239,125,0.25)"}`,
                }}>{ev.action}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14 }}>
        <span style={{ color:"#334155", fontSize:11 }}>Page {page} · {total.toLocaleString()} events</span>
        <div style={{ display:"flex", gap:8 }}>
          {[["← Prev", ()=>setPage(p=>Math.max(1,p-1)), page===1],
            ["Next →", ()=>setPage(p=>p+1), false]].map(([lbl,fn,dis])=>(
            <button key={lbl} onClick={fn} disabled={dis} style={{ padding:"6px 16px", borderRadius:8, fontSize:11, cursor:dis?"not-allowed":"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:dis?"#1e293b":"#64748b" }}>{lbl}</button>
          ))}
        </div>
      </div>
    </div>
  );
}