"use client"
import { useEffect, useState } from "react"

interface Scope {
  id: string; name: string; description: string; is_default: boolean; created_at: string
}

export default function AdminScopesPage() {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", is_default: false })

  function fetchScopes() {
    setLoading(true)
    fetch("/api/admin/scopes", { credentials: "include" })
      .then(r => r.json()).then(d => setScopes(d.scopes || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchScopes() }, [])

  async function handleCreate() {
    const res = await fetch("/api/admin/scopes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), credentials: "include",
    })
    if (res.ok) { setShowCreate(false); setForm({ name: "", description: "", is_default: false }); fetchScopes() }
    else alert((await res.json()).error || "Failed")
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scope?")) return
    await fetch("/api/admin/scopes/" + id, { method: "DELETE", credentials: "include" })
    fetchScopes()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="dd-page-title" style={{ margin: 0 }}>Scopes</div>
        <button className="dd-btn dd-btn-primary" onClick={() => setShowCreate(true)}>+ Create</button>
      </div>

      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Name</th><th>Description</th><th>Default</th><th>Created</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {scopes.map(s => (
                <tr key={s.id}>
                  <td><span className="dd-badge dd-badge-blue" style={{ fontWeight: 600, fontFamily: "monospace" }}>{s.name}</span></td>
                  <td style={{ fontSize: "0.8125rem" }}>{s.description || "-"}</td>
                  <td>{s.is_default ? <span className="dd-badge dd-badge-success">Default</span> : "No"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td><button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => handleDelete(s.id)}>Delete</button></td>
                </tr>
              ))}
              {scopes.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No scopes</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>

      {showCreate && <div className="dd-modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <h3>Create Scope</h3>
          <div className="sub">Add a new OAuth scope</div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Name</label><input className="dd-input" style={{ width: "100%" }} placeholder="openid profile email" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Description</label><input className="dd-input" style={{ width: "100%" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}><input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} /> Default scope</label>
          <div className="dd-modal-actions"><button className="dd-btn" onClick={() => setShowCreate(false)}>Cancel</button><button className="dd-btn dd-btn-primary" onClick={handleCreate}>Create</button></div>
        </div>
      </div>}
    </div>
  )
}
