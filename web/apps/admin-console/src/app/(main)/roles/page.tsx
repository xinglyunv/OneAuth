"use client"
import { useEffect, useState } from "react"

interface Role {
  id: string; name: string; description: string; is_system: boolean; created_at: string
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })

  function fetchRoles() {
    setLoading(true)
    fetch("/api/admin/roles", { credentials: "include" })
      .then(r => r.json()).then(d => setRoles(d.roles || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRoles() }, [])

  async function handleCreate() {
    const res = await fetch("/api/admin/roles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form), credentials: "include",
    })
    if (res.ok) { setShowCreate(false); setForm({ name: "", description: "" }); fetchRoles() }
    else alert((await res.json()).error || "Failed")
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role?")) return
    await fetch("/api/admin/roles/" + id, { method: "DELETE", credentials: "include" })
    fetchRoles()
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="dd-page-title" style={{ margin: 0 }}>Roles</div>
        <button className="dd-btn dd-btn-primary" onClick={() => setShowCreate(true)}>+ Create</button>
      </div>

      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Name</th><th>Description</th><th>System</th><th>Created</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td><span className="dd-badge dd-badge-purple" style={{ fontWeight: 600 }}>{r.name}</span></td>
                  <td style={{ fontSize: "0.8125rem" }}>{r.description || "-"}</td>
                  <td>{r.is_system ? <span className="dd-badge dd-badge-warning">System</span> : "No"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>{!r.is_system && <button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => handleDelete(r.id)}>Delete</button>}</td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={5}><div className="dd-empty">No roles</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>

      {showCreate && <div className="dd-modal-overlay" onClick={() => setShowCreate(false)}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <h3>Create Role</h3>
          <div className="sub">Add a new role</div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Name</label><input className="dd-input" style={{ width: "100%" }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="dd-field" style={{ marginBottom: "1rem" }}><label className="dd-label">Description</label><input className="dd-input" style={{ width: "100%" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="dd-modal-actions"><button className="dd-btn" onClick={() => setShowCreate(false)}>Cancel</button><button className="dd-btn dd-btn-primary" onClick={handleCreate}>Create</button></div>
        </div>
      </div>}
    </div>
  )
}
