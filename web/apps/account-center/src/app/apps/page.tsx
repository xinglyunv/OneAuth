"use client"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"

export default function AuthorizedAppsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const load = async () => {
    if (!token) { window.location.href = "http://localhost:3001/login"; return }
    try {
      const data = await api.listAuthorizedApps(token)
      setApps(data.apps || data.consents || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRevoke = async (clientId: string) => {
    if (!token) return
    try {
      await api.revokeAppAuth(token, clientId)
      setApps(prev => prev.filter(a => a.client_id !== clientId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败")
    }
  }

  if (loading) return <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}><div className="cc-skeleton" style={{ width: "100%", height: 120 }} /></div>

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>已授权应用</h2>
      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {apps.length === 0 ? (
        <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--cc-text-muted)", fontSize: "0.875rem" }}>暂无已授权应用</p>
        </div>
      ) : (
        <div className="cc-card" style={{ overflow: "hidden" }}>
          <table className="cc-table">
            <thead>
              <tr>
                <th>应用</th>
                <th>授权范围</th>
                <th>授权时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.client_id || app.app_id}>
                  <td>
										<div style={{ fontWeight: 500 }}>{app.app_name || app.name || "未知应用"}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--cc-text-muted)" }}>{app.client_id?.slice(0, 16)}...</div>
									</td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)" }}>
                    {Array.isArray(app.scopes) ? app.scopes.join(", ") : app.scopes || "-"}
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)" }}>
                    {app.created_at ? new Date(app.created_at).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td>
                    <button className="cc-btn cc-btn-ghost cc-btn-sm" style={{ color: "var(--cc-danger)" }} onClick={() => handleRevoke(app.client_id || app.app_id)}>
                      撤销授权
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
