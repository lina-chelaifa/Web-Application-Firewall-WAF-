import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import Login     from "./pages/Login";
import Events    from "./pages/Events";
import Stats     from "./pages/Stats";
import Rules     from "./pages/Rules";
import Blocklist from "./pages/Blocklist";
import { getToken, clearToken } from "./api";

const NAV = [
  { to:"/events",    icon:"⚡", label:"Live Events"  },
  { to:"/stats",     icon:"📊", label:"Statistics"   },
  { to:"/rules",     icon:"🔧", label:"Rules"        },
  { to:"/blocklist", icon:"🚫", label:"IP Blocklist" },
];

function Layout({ children, liveAlert }) {
  const navigate = useNavigate();
  function logout() { clearToken(); navigate("/login"); }

  return (
    <div style={{ minHeight:"100vh", background:"#080c10", display:"flex", fontFamily:"'DM Mono','Fira Code',monospace" }}>

      {/* Sidebar */}
      <aside style={{ width:220, background:"rgba(255,255,255,0.02)", borderRight:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", padding:"28px 0", flexShrink:0 }}>
        {/* Brand */}
        <div style={{ padding:"0 24px 28px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize:28, marginBottom:6 }}>🛡️</div>
          <div style={{ fontSize:10, color:"#4cc9f0", letterSpacing:3, textTransform:"uppercase" }}>WAF Admin</div>
          <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginTop:2 }}>Dashboard</div>
        </div>

        {/* Live alert */}
        {liveAlert && (
          <div style={{ margin:"16px 16px 0", background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:8, padding:"8px 12px", fontSize:10, color:"#ff4d6d", fontWeight:700, letterSpacing:1, animation:"pulse 1s infinite" }}>
            🚨 ATTACK BLOCKED
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex:1, padding:"20px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
              borderRadius:9, fontSize:12, fontWeight: isActive?700:400,
              textDecoration:"none", transition:"all .2s",
              background: isActive?"rgba(76,201,240,0.1)":"transparent",
              color:      isActive?"#4cc9f0":"#475569",
              borderLeft: isActive?"2px solid #4cc9f0":"2px solid transparent",
            })}>
              <span style={{ fontSize:14 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={logout} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:9, fontSize:12, cursor:"pointer", background:"transparent", color:"#334155", border:"none", fontFamily:"monospace", transition:"all .2s" }}>
            <span>⏻</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, padding:"36px 40px", overflowY:"auto" }}>
        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:32, alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#38ef7d", boxShadow:"0 0 8px #38ef7d" }} />
          <span style={{ fontSize:10, color:"#334155", letterSpacing:2, textTransform:"uppercase" }}>WAF Active — Port 8080</span>
        </div>
        {children}
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      `}</style>
    </div>
  );
}

function Protected({ element }) {
  return getToken() ? element : <Navigate to="/login" replace />;
}

export default function App() {
  const [liveAlert, setLiveAlert] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    try {
      // eslint-disable-next-line no-undef
      const socket = io("http://localhost:5000");
      socket.on("new_block_event", () => {
        setLiveAlert(true);
        setTimeout(() => setLiveAlert(false), 4000);
      });
      return () => socket.disconnect();
    } catch (_) {}
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/events"    element={<Protected element={<Layout liveAlert={liveAlert}><Events /></Layout>} />} />
        <Route path="/stats"     element={<Protected element={<Layout liveAlert={liveAlert}><Stats /></Layout>} />} />
        <Route path="/rules"     element={<Protected element={<Layout liveAlert={liveAlert}><Rules /></Layout>} />} />
        <Route path="/blocklist" element={<Protected element={<Layout liveAlert={liveAlert}><Blocklist /></Layout>} />} />
        <Route path="*" element={<Navigate to={getToken() ? "/events" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}