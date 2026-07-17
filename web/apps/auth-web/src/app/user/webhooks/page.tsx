"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

export default function AccountWebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState("")
  const [creating, setCreating] = useState(false)

  const token = () => localStorage.getItem("access_token") || ""

  const fetchWebhooks = useCallback(() => {
    if (!token()) { router.replace("/login"); return }
    fetch("/api/webhooks", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : Promise.reject("获取失败"))
      .then(data => setWebhooks(data.webhooks))
      .catch(e => setError(typeof e === "string" ? e : e.message))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!name.trim() || !url.trim()) { setError("请填写名称和 URL"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), events: events.split("\n").map(e => e.trim()).filter(Boolean) }),
      })
      if (!res.ok) throw new Error("创建失败")
      setSuccess("Webhook 创建成功")
      setName(""); setUrl(""); setEvents("")
      fetchWebhooks()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败")
    } finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } })
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch { setError("删除失败") }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Webhooks</h2>
      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}
      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1.25rem" }}>创建 Webhook</h3>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "1rem" }}>
            <label className="cc-label" htmlFor="wh_name">名称</label>
            <input id="wh_name" className="cc-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="通知 Webhook" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="cc-label" htmlFor="wh_url">URL</label>
            <input id="wh_url" className="cc-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="cc-label" htmlFor="wh_events">事件（每行一个）</label>
            <textarea id="wh_events" className="cc-input" value={events} onChange={e => setEvents(e.target.value)} placeholder="user.created&#10;user.login" rows={3} style={{ resize: "vertical" }} />
          </div>
          <button type="submit" className="cc-btn cc-btn-primary" disabled={creating}>{creating ? "创建中..." : "创建 Webhook"}</button>
        </form>
      </div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>我的 Webhooks</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}><span className="cc-spinner" /></div>
      ) : webhooks.length === 0 ? (
        <div className="cc-empty">暂无 Webhook</div>
      ) : (
        <div className="cc-card" style={{ overflow: "auto" }}>
          <table className="cc-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>URL</th>
                <th>事件</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map(wh => (
                <tr key={wh.id}>
                  <td style={{ fontWeight: 500 }}>{wh.name}</td>
                  <td><code style={{ fontSize: "0.8125rem" }}>{wh.url}</code></td>
                  <td><div style={{ fontSize: "0.8125rem" }}>{(wh.events || []).join(", ")}</div></td>
                  <td><span className={wh.is_active ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}>{wh.is_active ? "活跃" : "停用"}</span></td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)" }}>{new Date(wh.created_at).toLocaleDateString("zh-CN")}</td>
                  <td><button className="cc-btn cc-btn-danger cc-btn-sm" onClick={() => handleDelete(wh.id)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
