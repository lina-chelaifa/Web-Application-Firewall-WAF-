import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setToken } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { const res = await login(username, password); setToken(res.data.token); navigate("/events"); }
    catch(err) { setError(err.response?.data?.error||"Invalid credentials"); }
    finally { setLoading(false); }
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"11px 16px", color:"#e2e8f0", fontSize:13, fontFamily:"'DM Mono','Fira Code',monospace", boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#080c10", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono','Fira Code',monospace", position:"relative", overflow:"hidden" }}>
      {/* Background grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(76,201,240,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(76,201,240,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      {/* Glow */}
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translate(-50%,-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(76,201,240,0.06) 0%,transparent 70%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", width:420, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:40, backdropFilter:"blur(10px)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🛡️</div>
          <div style={{ fontSize:10, color:"#4cc9f0", letterSpacing:4, textTransform:"uppercase", marginBottom:6 }}>Web Application Firewall</div>
          <div style={{ fontSize:24, fontWeight:700, color:"#f0f6fc", letterSpacing:-1 }}>Admin Panel</div>
          <div style={{ width:40, height:2, background:"linear-gradient(90deg,transparent,#4cc9f0,transparent)", margin:"12px auto 0" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:3, textTransform:"uppercase", marginBottom:7 }}>Username</div>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" required style={inp} />
          </div>
          <div>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:3, textTransform:"uppercase", marginBottom:7 }}>Password</div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
          </div>

          {error && (
            <div style={{ background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.3)", color:"#ff4d6d", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ marginTop:6, padding:"12px", borderRadius:10, fontSize:13, fontWeight:700, cursor: loading?"not-allowed":"pointer", background: loading?"rgba(76,201,240,0.2)":"#4cc9f0", color:"#080c10", border:"none", transition:"all .2s", opacity:loading?0.7:1 }}>
            {loading ? "Authenticating…" : "Login →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:20, fontSize:10, color:"#1e293b" }}>
          Default: <span style={{ color:"#334155" }}>admin / admin123</span>
        </div>
      </div>
    </div>
  );
}