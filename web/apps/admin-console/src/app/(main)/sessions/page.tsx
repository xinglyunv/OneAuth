"use client"
import { useEffect, useState } from "react"

interface Session {
  id: string; user_id: string; ip_address: string; user_agent: string
  role: string; login_type: string; expires_at: string; created_at: string
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 30
  const [loading, setLoading] = useState(true)

  function fetchSessions() {
    setLoading(true)
    fetch("/api/admin/sessions?page=" + page + "&size=" + size, { credentials: "include" })
      .then(r => r.json()).then(d => { setSessions(d.sessions || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSessions() }, [page])

  async function revokeSession(sid: string) {
    if (!confirm("Revoke this session?")) return
    await fetch("/api/admin/sessions/" + sid, { method: "DELETE", credentials: "include" })
    fetchSessions()
  }

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div className="dd-page-title">Active Sessions</div>
      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>User ID</th><th>IP</th><th>Role</th><th>Login Type</th><th>User Agent</th><th>Expires</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{s.user_id?.substring(0, 12)}...</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{s.ip_address || "-"}</td>
                  <td><span className="dd-badge dd-badge-purple">{s.role}</span></td>
                  <td><span className="dd-badge dd-badge-blue">{s.login_type}</span></td>
                  <td style={{ fontSize: "0.75rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.user_agent?.substring(0, 60) || "-"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{s.expires_at ? new Date(s.expires_at).toLocaleString() : "-"}</td>
                  <td><button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => revokeSession(s.id)}>Revoke</button></td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={7}><div className="dd-empty">No active sessions</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>
      {totalPages > 1 && <div className="dd-pagination">
        <button className="dd-btn dd-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span className="dd-page-info">Page {page} of {totalPages} ({total} total)</span>
        <button className="dd-btn dd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
    </div>
  )
}
