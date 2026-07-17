"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { api } from "@identity/shared"
import type { OAuthApp, CreateAppResponse } from "@identity/shared"

export default function AccountAppsPage() {
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

  const fetchApps = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    api
      .listApps(token)
      .then((data: { apps: OAuthApp[] }) => setApps(data.apps ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { fetchApps() }, [fetchApps])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setSuccess(""); setNewApp(null)
    if (!name.trim()) { setError("请输入应用名称"); return }
    const token = localStorage.getItem("access_token") || ""
    const uris = redirectUris.split("\n").map(u => u.trim()).filter(Boolean)
    setCreating(true)
    try {
      const result = await api.createApp(token, { name: name.trim(), description: description.trim(), redirect_uris: uris })
      setNewApp(result); setSuccess("应用创建成功")
      setName(""); setDescription(""); setRedirectUris("")
      const updated = await api.listApps(token)
      setApps(updated.apps ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建应用失败")
    } finally { setCreating(false) }
  }

  const handleDelete = async (clientId: string) => {
    const token = localStorage.getItem("access_token") || ""
    try {
      await fetch(`/api/apps/${clientId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setApps(prev => prev.filter(a => a.client_id !== clientId))
    } catch {
      setError("删除应用失败")
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>OAuth 应用</h2>
      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}
      {newApp && (
        <div className="cc-alert cc-alert-success" style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>应用已创建，请立即保存凭证：</div>
          <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div><code style={{ background: "#bbf7d0", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>Client ID: {newApp.client_id}</code></div>
            <div><code style={{ background: "#bbf7d0", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", wordBreak: "break-all" }}>Client Secret: {newApp.client_secret}</code></div>
          </div>
        </div>
      )}
      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem" }}>创建新应用</h3>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "1rem" }}>
            <label className="cc-label" htmlFor="app_name">应用名称</label>
            <input id="app_name" className="cc-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="我的应用" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="cc-label" htmlFor="app_desc">应用描述</label>
            <input id="app_desc" className="cc-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="简要描述" />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="cc-label" htmlFor="app_uris">回调地址（每行一个）</label>
            <textarea id="app_uris" className="cc-input" value={redirectUris} onChange={e => setRedirectUris(e.target.value)} placeholder="https://example.com/callback" rows={3} style={{ resize: "vertical" }} />
          </div>
          <button type="submit" className="cc-btn cc-btn-primary" disabled={creating}>{creating ? "创建中..." : "创建应用"}</button>
        </form>
      </div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>我的应用</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}><span className="cc-spinner" /></div>
      ) : apps.length === 0 ? (
        <div className="cc-empty">暂无应用</div>
      ) : (
        <div className="cc-card" style={{ overflow: "auto" }}>
          <table className="cc-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>Client ID</th>
                <th>回调地址</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.client_id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{app.name}</div>
                    {app.description && <div style={{ fontSize: "0.75rem", color: "var(--cc-text-muted)", marginTop: "0.125rem" }}>{app.description}</div>}
                  </td>
                  <td><code style={{ fontSize: "0.8125rem" }}>{app.client_id.slice(0, 16)}...</code></td>
                  <td><div style={{ fontSize: "0.8125rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.redirect_uris?.[0] || "-"}{app.redirect_uris && app.redirect_uris.length > 1 ? <span style={{ color: "var(--cc-text-muted)", marginLeft: "0.25rem" }}>+{app.redirect_uris.length - 1}</span> : null}</div></td>
                  <td><span className={app.status === "active" ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}>{app.status === "active" ? "活跃" : app.status}</span></td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)" }}>{new Date(app.created_at).toLocaleDateString("zh-CN")}</td>
                  <td><button className="cc-btn cc-btn-danger cc-btn-sm" onClick={() => handleDelete(app.client_id)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
