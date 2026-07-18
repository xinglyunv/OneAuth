"use client"
import { useEffect, useState } from "react"
import { api, AddUserEmailResponse } from "@identity/shared"

export default function AppsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [uri, setUri] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const load = async () => {
    if (!token) { window.location.href = "http://localhost:3001/developer/login"; return }
    try {
      const r = await api.listApps(token)
      setApps(r.apps || [])
    } catch { /* noop */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const r = await api.createApp(token, { name, description: desc, redirect_uris: uri.split("\n").filter(u => u.trim()) })
      setResult(`应用创建成功！\nClient ID: ${r.client_id}\nClient Secret: ${r.client_secret}\n请立即保存 Client Secret，关闭后无法再次查看！`)
      setShowForm(false)
      setName(""); setDesc(""); setUri("")
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建失败")
    }
  }

  if (loading) return <div className="dd-card"><div className="dd-card-body"><div className="dd-skeleton" style={{ height: 120 }} /></div></div>

  return (
    <div>
      <h1 className="dd-page-title" style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--dd-text-primary)" }}>OAuth 应用</h1>
      <p style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)", marginBottom: "1.5rem" }}>管理您的 OAuth 2.0 / OIDC 应用</p>

      {error && <div className="dd-alert dd-alert-error">{error}</div>}
      {result && (
        <div className="dd-card" style={{ marginBottom: "1rem" }}>
          <div className="dd-card-header">应用凭据</div>
          <div className="dd-card-body">
            <pre style={{ background: "var(--dd-surface-subtle)", padding: "1rem", borderRadius: "var(--dd-radius)", fontSize: "0.8125rem", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>{result}</pre>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button className="dd-btn dd-btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "创建应用"}
        </button>
      </div>

      {showForm && (
        <div className="dd-card" style={{ marginBottom: "1rem" }}>
          <div className="dd-card-header">创建新应用</div>
          <div className="dd-card-body">
            <form onSubmit={create}>
              <label className="dd-label" style={{ marginTop: 0 }}>应用名称</label>
              <input className="dd-input" value={name} onChange={e => setName(e.target.value)} placeholder="我的应用" required style={{ marginBottom: "0.75rem" }} />

              <label className="dd-label">应用描述</label>
              <input className="dd-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="简单描述应用用途" style={{ marginBottom: "0.75rem" }} />

              <label className="dd-label">回调 URL（每行一个）</label>
              <textarea className="dd-input" value={uri} onChange={e => setUri(e.target.value)} placeholder="https://example.com/callback" rows={3} style={{ marginBottom: "1rem", resize: "vertical" }} />

              <button type="submit" className="dd-btn dd-btn-primary">创建</button>
            </form>
          </div>
        </div>
      )}

      <div className="dd-card">
        <div className="dd-card-header">应用列表 ({apps.length})</div>
        <div className="dd-card-body" style={{ padding: 0 }}>
          {apps.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--dd-text-muted)", fontSize: "0.875rem" }}>暂无应用，点击上方按钮创建第一个 OAuth 应用</div>
          ) : (
            <table className="dd-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>Client ID</th>
                  <th>状态</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a: any) => (
                  <tr key={a.client_id}>
                    <td style={{ fontWeight: 500 }}>{a.name || a.client_name || "-"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--dd-text-muted)" }}>{a.client_id?.slice(0, 24)}...</td>
                    <td><span className={a.status === "approved" || a.status === "active" ? "dd-badge dd-badge-success" : "dd-badge dd-badge-info"}>{a.status || "pending"}</span></td>
                    <td style={{ fontSize: "0.75rem", color: "var(--dd-text-muted)" }}>{a.created_at ? new Date(a.created_at).toLocaleDateString("zh-CN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
