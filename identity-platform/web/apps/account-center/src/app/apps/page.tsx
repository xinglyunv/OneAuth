"use client"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
export default function AuthorizedAppsPage() {
  const [apps, setApps] = useState<any[]>([])
  useEffect(() => { api.listAuthorizedApps(localStorage.getItem("access_token") || "").then((r: any) => setApps(r.authorizations || [])).catch(() => {}) }, [])
  const revoke = async (id: string) => {
    await api.revokeAppAuth(localStorage.getItem("access_token") || "", id)
    setApps(a => a.filter(x => x.client_id !== id))
  }
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>已授权应用</h2>
      {apps.length === 0 ? <p style={{ color: "#999" }}>暂无已授权应用</p> : apps.map((a: any) => (
        <div key={a.client_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div>
            <strong>{a.app_name}</strong>
            <p style={{ fontSize: 12, color: "#999", margin: 0 }}>权限：{a.scopes?.join(", ")} · {a.created_at}</p>
          </div>
          <button onClick={() => revoke(a.client_id)} style={{ padding: "4px 12px", background: "#ff4d4f", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>撤销</button>
        </div>
      ))}
    </div>
  )
}
