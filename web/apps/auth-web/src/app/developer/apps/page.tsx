"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { api } from "@identity/shared"
import type { OAuthApp, CreateAppResponse } from "@identity/shared"

export default function DeveloperAppsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<OAuthApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [redirectUris, setRedirectUris] = useState("")
  const [creating, setCreating] = useState(false)
  const [newApp, setNewApp] = useState<CreateAppResponse | null>(null)

  const token = () => localStorage.getItem("access_token") || ""

  const fetchApps = useCallback(() => {
    if (!token()) { router.replace("/developer/login"); return }
    api.listApps(token()).then((data: { apps: OAuthApp[] }) => setApps(data.apps ?? [])).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  }, [router])

  useEffect(() => { fetchApps() }, [fetchApps])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setSuccess(""); setNewApp(null)
    if (!name.trim()) { setError("请输入应用名称"); return }
    const uris = redirectUris.split("\n").map(u => u.trim()).filter(Boolean)
    setCreating(true)
    try {
      const result = await api.createApp(token(), { name: name.trim(), description: description.trim(), redirect_uris: uris })
      setNewApp(result); setSuccess("应用创建成功")
      setName(""); setDescription(""); setRedirectUris("")
      fetchApps()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "创建失败") } finally { setCreating(false) }
  }

  const handleDelete = async (clientId: string) => {
    try {
      await fetch(`/api/apps/${clientId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } })
      setApps(prev => prev.filter(a => a.client_id !== clientId))
    } catch { setError("删除失败") }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>OAuth 应用</h2>
      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}
      {newApp && (
        <div className="cc-alert cc-alert-success" style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>应用已创建，请立即保存凭证：</div>
          <div style={{ fontSize: "0.875rem" }}>
            <div><code style={{ background: "#bbf7d0", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>Client ID: {newApp.client_id}</code></div>
            <div><code style={{ background: "#bbf7d0", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", wordBreak: "break-all" }}>Client Secret: {newApp.client_secret}</code></div>
          </div>
        </div>
      )}
      <div className="dd-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem" }}>创建新应用</h3>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "1rem" }}>
            <label className="dd-label" htmlFor="dev_app_name">应用名称</label>
            <input id="dev_app_name" className="dd-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="我的应用" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="dd-label" htmlFor="dev_app_desc">应用描述</label>
            <input id="dev_app_desc" className="dd-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="简要描述" />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="dd-label" htmlFor="dev_app_uris">回调地址（每行一个）</label>
            <textarea id="dev_app_uris" className="dd-input" value={redirectUris} onChange={e => setRedirectUris(e.target.value)} placeholder="https://example.com/callback" rows={3} style={{ resize: "vertical" }} />
          </div>
          <button type="submit" className="dd-btn dd-btn-primary" disabled={creating}>{creating ? "创建中..." : "创建应用"}</button>
        </form>
      </div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>我的应用</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}><div className="dd-spinner" style={{ width: 32, height: 32, fontSize: 32 }} /></div>
      ) : apps.length === 0 ? (
        <div className="dd-empty" style={{ textAlign: "center", padding: "3rem 0", color: "var(--dd-text-muted)" }}>暂无应用</div>
      ) : (
        <div className="dd-card" style={{ overflow: "auto" }}>
          <table className="dd-table">
            <thead><tr><th>名称</th><th>Client ID</th><th>回调地址</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.client_id}>
                  <td style={{ fontWeight: 500 }}>{app.name}</td>
                  <td><code style={{ fontSize: "0.8125rem" }}>{app.client_id.slice(0, 16)}...</code></td>
                  <td style={{ fontSize: "0.8125rem" }}>{(app.redirect_uris || []).join(", ").slice(0, 40)}</td>
                  <td><span className={app.status === "active" ? "dd-badge dd-badge-success" : "dd-badge dd-badge-warning"}>{app.status === "active" ? "活跃" : app.status}</span></td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)" }}>{new Date(app.created_at).toLocaleDateString("zh-CN")}</td>
                  <td><button className="dd-btn dd-btn-danger dd-btn-sm" onClick={() => handleDelete(app.client_id)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
