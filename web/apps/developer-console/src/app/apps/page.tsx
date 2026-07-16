"use client"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
export default function AppsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [uri, setUri] = useState("")
  const [result, setResult] = useState("")
  const load = () => api.listApps(localStorage.getItem("access_token") || "").then((r: any) => setApps(r.apps || [])).catch(() => {})
  useEffect(() => { load() }, [])
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await api.createApp(localStorage.getItem("access_token") || "", { name, description: desc, redirect_uris: uri.split("\n") })
    setResult(`Client ID: ${r.client_id}\nClient Secret: ${r.client_secret}\n请立即保存 Secret！`)
    setShowForm(false); load()
  }
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>我的应用</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "8px 16px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>创建应用</button>
      </div>
      {showForm && (
        <form onSubmit={create} style={{ background: "#fafafa", padding: 16, borderRadius: 4, marginBottom: 16 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="应用名称" required style={{ width: "100%", padding: 8, marginBottom: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="应用描述" style={{ width: "100%", padding: 8, marginBottom: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
          <textarea value={uri} onChange={e => setUri(e.target.value)} placeholder="回调 URL（每行一个）" rows={3} style={{ width: "100%", padding: 8, marginBottom: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }} />
          <button type="submit" style={{ padding: "8px 16px", background: "#52c41a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>提交</button>
        </form>
      )}
      {result && <pre style={{ background: "#f0f0f0", padding: 12, borderRadius: 4, fontSize: 12, whiteSpace: "pre-wrap" }}>{result}</pre>}
      {apps.length === 0 ? <p style={{ color: "#999" }}>暂无应用</p> : apps.map((a: any) => (
        <div key={a.client_id} style={{ padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
          <strong>{a.name}</strong>
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>Client ID: {a.client_id} · 状态: {a.status}</p>
        </div>
      ))}
    </div>
  )
}
