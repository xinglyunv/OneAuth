"use client"
import { useEffect, useState } from "react"

interface AppItem {
  id: string; name: string; client_id: string; type: string; status: string
  description: string; created_at: string
}

export default function AdminAppsPage() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 20
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)

  function fetchApps() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) params.set("status", status)
    fetch("/api/admin/apps?" + params, { credentials: "include" })
      .then(r => r.json()).then(d => { setApps(d.apps || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchApps() }, [page, status])

  async function handleAction(appId: string, action: string) {
    await fetch("/api/admin/apps/" + appId + "/" + action, { method: "PUT", credentials: "include" })
    fetchApps()
  }

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div className="dd-page-title">Application Management</div>
      <div className="dd-search-bar">
        <div className="dd-field"><label className="dd-label">Status</label><select className="dd-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All</option><option value="pending">Pending</option><option value="active">Active</option><option value="rejected">Rejected</option></select></div>
      </div>
      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Name</th><th>Client ID</th><th>Type</th><th>Status</th><th>Created</th><th style={{ width: 160 }}>Actions</th></tr></thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id}>
                  <td><span style={{ fontWeight: 500 }}>{a.name}</span><div style={{ fontSize: "0.75rem", color: "#6C757D", marginTop: 2 }}>{a.description || "-"}</div></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{a.client_id}</td>
                  <td>{a.type}</td>
                  <td><span className={"dd-badge " + (a.status === "active" ? "dd-badge-success" : a.status === "pending" ? "dd-badge-warning" : "dd-badge-danger")}>{a.status}</span></td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {a.status === "pending" && <><button className="dd-btn dd-btn-sm dd-btn-success" onClick={() => handleAction(a.id, "approve")}>Approve</button><button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => handleAction(a.id, "reject")}>Reject</button></>}
                      {a.status === "active" && <button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => handleAction(a.id, "deactivate")}>Suspend</button>}
                      {a.status === "rejected" && <button className="dd-btn dd-btn-sm dd-btn-success" onClick={() => handleAction(a.id, "approve")}>Re-activate</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && <tr><td colSpan={6}><div className="dd-empty">No applications found</div></td></tr>}
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
