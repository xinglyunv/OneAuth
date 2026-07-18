"use client"
import { useEffect, useState } from "react"
import { api, Session } from "@identity/shared"

function detectOS(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows"
  if (/Mac/i.test(ua)) return "macOS"
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "Linux"
  if (/Android/i.test(ua)) return "Android"
  if (/iPhone|iPad/i.test(ua)) return "iOS"
  return "Unknown"
}

function detectBrowser(ua: string): string {
  if (/Edg/i.test(ua)) return "Edge"
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Chrome"
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari"
  if (/Firefox/i.test(ua)) return "Firefox"
  return "Unknown"
}

export default function DevicesPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const load = async () => {
    if (!token) { window.location.href = "http://localhost:3001/login"; return }
    try {
      const data = await api.listSessions(token)
      setSessions(data.sessions || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRevoke = async (sessionId: string) => {
    if (!token) return
    try {
      await api.revokeSession(token, sessionId)
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败")
    }
  }

  if (loading) return <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}><div className="cc-skeleton" style={{ width: "100%", height: 120 }} /></div>

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>登录设备</h2>
      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {sessions.length === 0 ? (
        <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--cc-text-muted)", fontSize: "0.875rem" }}>暂无活跃设备</p>
        </div>
      ) : (
        <div className="cc-card" style={{ overflow: "hidden" }}>
          <table className="cc-table">
            <thead>
              <tr>
                <th>设备</th>
                <th>系统 / 浏览器</th>
                <th>IP / 地区</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.session_id}>
                  <td style={{ fontWeight: 500 }}>{s.device_name || "Web"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)" }}>
                    {detectOS(s.user_agent || "")} · {detectBrowser(s.user_agent || "")}
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)", fontFamily: "monospace" }}>
                    {s.ip_address || "-"} {s.location ? "· " + s.location : ""}
                  </td>
                  <td>
                    <span className={s.status === "active" ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}>
                      {s.status === "active" ? "活跃" : s.status}
                    </span>
                  </td>
                  <td>
                    <button className="cc-btn cc-btn-ghost cc-btn-sm" style={{ color: "var(--cc-danger)" }} onClick={() => handleRevoke(s.session_id)}>
                      退出
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
