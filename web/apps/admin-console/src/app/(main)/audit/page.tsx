"use client"
import { useEffect, useState } from "react"

interface LogEntry {
  id: string; action: string; actor_id: string; target_type: string
  target_id: string; metadata: any; ip_address: string; created_at: string
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 30
  const [action, setAction] = useState("")
  const [loading, setLoading] = useState(true)

  function fetchLogs() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (action) params.set("action", action)
    fetch("/api/admin/audit-logs?" + params, { credentials: "include" })
      .then(r => r.json()).then(d => { setLogs(d.logs || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [page, action])

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div className="dd-page-title">Audit Logs</div>
      <div className="dd-search-bar">
        <div className="dd-field"><label className="dd-label">Action</label><select className="dd-select" value={action} onChange={e => { setAction(e.target.value); setPage(1) }}><option value="">All</option><option value="user.login">Login</option><option value="user.register">Register</option><option value="user.logout">Logout</option><option value="app.created">App Created</option><option value="app.deleted">App Deleted</option><option value="admin.action">Admin Action</option></select></div>
      </div>
      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>IP</th><th>Time</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><span className="dd-badge dd-badge-blue">{l.action}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{l.actor_id ? l.actor_id.substring(0, 8) + "..." : "-"}</td>
                  <td style={{ fontSize: "0.8125rem" }}>{l.target_type ? l.target_type + "/" + (l.target_id?.substring(0, 8) || "") : "-"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{l.ip_address || "-"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No audit logs found</div></td></tr>}
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
