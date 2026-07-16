"use client"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
export default function DevicesPage() {
  const [sessions, setSessions] = useState<any[]>([])
  useEffect(() => { api.listSessions(localStorage.getItem("access_token") || "").then((r: any) => setSessions(r.sessions || [])).catch(() => {}) }, [])
  const revoke = async (id: string) => {
    await api.revokeSession(localStorage.getItem("access_token") || "", id)
    setSessions(s => s.filter(x => x.session_id !== id))
  }
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>登录设备</h2>
      {sessions.length === 0 ? <p style={{ color: "#999" }}>暂无活跃会话</p> : sessions.map((s: any) => (
        <div key={s.session_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div>
            <strong>{s.device_name || "未知设备"}</strong>
            <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{s.os} / {s.browser} · {s.ip_address}</p>
          </div>
          <div>
            {s.is_current ? <span style={{ color: "#1677ff", fontSize: 12 }}>当前设备</span> : <button onClick={() => revoke(s.session_id)} style={{ padding: "4px 12px", background: "#ff4d4f", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>登出</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
