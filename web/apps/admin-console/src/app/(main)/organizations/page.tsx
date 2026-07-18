"use client"
import { useEffect, useState } from "react"

interface Org {
  id: string; name: string; domain: string; status: string; created_at: string
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 20
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", domain: "" })

  function fetchOrgs() {
    setLoading(true)
    fetch("/api/admin/orgs?page=" + page + "&size=" + size, { credentials: "include" })
      .then(r => r.json()).then(d => { setOrgs(d.orgs || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrgs() }, [page])

  async function handleCreate() {
    const res = await fetch("/api/admin/orgs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), credentials: "include",
    })
    if (res.ok) { setShowCreate(false); setForm({ name: "", domain: "" }); fetchOrgs() }
    else alert((await res.json()).error || "Failed")
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this organization?")) return
    await fetch("/api/admin/orgs/" + id, { method: "DELETE", credentials: "include" })
    fetchOrgs()
  }

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="dd-page-title" style={{ margin: 0 }}>Organizations</div>
        <button className="dd-btn dd-btn-primary" onClick={() => setShowCreate(true)}>+ Create</button>
      </div>

      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Name</th><th>Domain</th><th>Status</th><th>Created</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {orgs.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontWeight: 500 }}>{o.name}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{o.domain || "-"}</td>
                  <td><span className={"dd-badge " + (o.status === "active" ? "dd-badge-success" : "dd-badge-danger")}>{o.status}</span></td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td><button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => handleDelete(o.id)}>Delete</button></td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No organizations</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>

      {totalPages > 1 && <div className="dd-pagination">
        <button className="dd-btn dd-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span className="dd-page-info">Page {page} of {totalPages}</span>
        <button className="dd-btn dd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}

      {showCreate && <div className="dd-modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <h3>Create Organization</h3>
          <div className="sub">Add a new organization</div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Name</label><input className="dd-input" style={{ width: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Domain</label><input className="dd-input" style={{ width: "100%" }} placeholder="example.com" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} /></div>
          <div className="dd-modal-actions"><button className="dd-btn" onClick={() => setShowCreate(false)}>Cancel</button><button className="dd-btn dd-btn-primary" onClick={handleCreate}>Create</button></div>
        </div>
      </div>}
    </div>
  )
}
