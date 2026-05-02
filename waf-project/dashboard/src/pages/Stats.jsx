import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, Cell } from "recharts";
import { fetchStats } from "../api";

const COLORS = ["#ff6b35","#ffd23f","#c77dff","#ff4d6d","#4cc9f0","#38ef7d","#f72585","#06d6a0"];

function KPI({ label, value, color, sub }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"20px 24px", borderTop:`2px solid ${color}` }}>
      <div style={{ fontSize:11, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:"#334155", marginTop:6 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px" }}>
      <div style={{ color:"#64748b", fontSize:10, marginBottom:4 }}>{label}</div>
      <div style={{ color:"#4cc9f0", fontWeight:700, fontSize:14 }}>{payload[0].value} events</div>
    </div>
  );
};

export default function Stats() {
  const [stats,  setStats]  = useState(null);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    fetchStats().then(r => { setStats(r.data); setLoading(false); }).catch(()=>setLoading(false));
    const t = setInterval(() => fetchStats().then(r=>setStats(r.data)).catch(()=>{}), 10000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div style={{ textAlign:"center", padding:"80px 0", color:"#334155", fontFamily:"monospace" }}>Loading statistics…</div>;
  if (!stats)  return <div style={{ textAlign:"center", padding:"80px 0", color:"#ff4d6d", fontFamily:"monospace" }}>Failed to load statistics.</div>;

  const catData = (stats.by_category||[]).map(r => ({
    name: r.rule_name?.replace(/_/g," ").slice(0,18)||r.rule_name,
    count: r.count,
  }));

  return (
    <div style={{ fontFamily:"'DM Mono','Fira Code',monospace" }}>
      <div style={{ marginBottom:28 }}>
        <p style={{ color:"#4cc9f0", fontSize:10, letterSpacing:4, textTransform:"uppercase", margin:"0 0 6px" }}>Security Analytics</p>
        <h1 style={{ fontSize:30, fontWeight:700, color:"#f0f6fc", margin:0, letterSpacing:-1 }}>Statistics</h1>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <KPI label="Total Requests" value={stats.total.toLocaleString()} color="#4cc9f0" sub="All time" />
        <KPI label="Attacks Blocked" value={stats.total_block.toLocaleString()} color="#ff4d6d" sub="Threats stopped" />
        <KPI label="Requests Allowed" value={stats.total_allow.toLocaleString()} color="#38ef7d" sub="Clean traffic" />
        <KPI label="Block Rate" value={`${stats.block_rate}%`} color={stats.block_rate>20?"#ff6b35":"#ffd23f"} sub="Of all traffic" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

        {/* Top rules bar chart */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:24 }}>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Top Blocked Rules</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#e2e8f0", marginBottom:20 }}>Attack Breakdown</div>
          {catData.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#334155" }}>No blocked events yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={catData} layout="vertical" margin={{ left:0, right:10 }}>
                <XAxis type="number" tick={{ fill:"#334155", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill:"#64748b", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0,6,6,0]}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top IPs */}
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:24 }}>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Identity Threats</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#e2e8f0", marginBottom:20 }}>Top Attacking IPs</div>
          {!(stats.top_ips||[]).length ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#334155" }}>No blocked events yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {stats.top_ips.map((item,i) => (
                <div key={item.source_ip} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ color:"#1e293b", fontSize:10, width:16, textAlign:"right" }}>{i+1}</span>
                  <span style={{ fontFamily:"monospace", color:"#64748b", fontSize:11, width:120, flexShrink:0 }}>{item.source_ip}</span>
                  <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:4, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, background: COLORS[i%COLORS.length], width:`${(item.count/stats.top_ips[0].count)*100}%`, transition:"width .6s" }} />
                  </div>
                  <span style={{ color: COLORS[i%COLORS.length], fontSize:12, fontWeight:700, width:28, textAlign:"right" }}>{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hourly line chart */}
      {(stats.hourly||[]).length > 0 && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:24 }}>
          <div style={{ fontSize:10, color:"#475569", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Traffic Timeline</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#e2e8f0", marginBottom:20 }}>Requests — Last 24 Hours</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.hourly}>
              <XAxis dataKey="hour" tick={{ fill:"#334155", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#334155", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#4cc9f0" strokeWidth={2} dot={false} activeDot={{ r:4, fill:"#4cc9f0" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}