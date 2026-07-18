"use client"
import { useEffect, useState } from "react"

interface User {
  id: string; email: string; username: string; status: string
  email_verified: boolean; mfa_enabled: boolean; display_name: string; created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const size = 20
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<any>(null)

  function fetchUsers() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (search) params.set("search", search)
    if (status) params.set("status", status)
    fetch("/api/admin/users?" + params, { credentials: "include" })
      .then(r => r.json()).then(d => { setUsers(d.users || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [page, status])

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); fetchUsers() }

  async function toggleStatus(uid: string) {
    await fetch("/api/admin/users/" + uid + "/toggle-status", { method: "PUT", credentials: "include" })
    fetchUsers()
  }

  async function forceLogout(uid: string) {
    if (!confirm("Force logout all sessions for this user?")) return
    await fetch("/api/admin/users/" + uid + "/force-logout", { method: "POST", credentials: "include" })
  }

  async function resetPassword(uid: string) {
    const pwd = prompt("Enter new password (min 8 chars):")
    if (!pwd || pwd.length < 8) { alert("Password must be at least 8 characters"); return }
    const res = await fetch("/api/admin/users/" + uid + "/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: pwd }), credentials: "include",
    })
    if (res.ok) alert("Password reset successful"); else { const d = await res.json(); alert(d.error || "Failed") }
  }

  function viewDetail(uid: string) {
    setDetail(null)
    fetch("/api/admin/users/" + uid, { credentials: "include" })
      .then(r => r.json()).then(d => setDetail(d.user))
  }

  const totalPages = Math.ceil(total / size) || 1

  return (
    <div>
      <div className="dd-page-title">User Management</div>
      <form className="dd-search-bar" onSubmit={handleSearch}>
        <div className="dd-field"><label className="dd-label">Search</label><input className="dd-input" placeholder="Email or username..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="dd-field"><label className="dd-label">Status</label><select className="dd-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
        <button type="submit" className="dd-btn dd-btn-primary">Search</button>
      </form>

      <div className="dd-card"><div className="dd-card-body" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center" }}><div className="dd-spinner" /></div> : (
          <table className="dd-table">
            <thead><tr><th>Email</th><th>Username</th><th>Status</th><th>Verified</th><th>MFA</th><th>Created</th><th style={{ width: 180 }}>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><span style={{ fontWeight: 500 }}>{u.email}</span></td>
                  <td>{u.username || "-"}</td>
                  <td><span className={"dd-badge " + (u.status === "active" ? "dd-badge-success" : u.status === "suspended" ? "dd-badge-danger" : "dd-badge-warning")}>{u.status}</span></td>
                  <td>{u.email_verified ? "Yes" : "No"}</td>
                  <td>{u.mfa_enabled ? "Yes" : "No"}</td>
                  <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="dd-btn dd-btn-sm" onClick={() => viewDetail(u.id)}>View</button>
                      <button className="dd-btn dd-btn-sm dd-btn-danger" onClick={() => toggleStatus(u.id)}>{u.status === "active" ? "Deactivate" : "Activate"}</button>
                      <button className="dd-btn dd-btn-sm" onClick={() => forceLogout(u.id)}>Logout</button>
                      <button className="dd-btn dd-btn-sm" onClick={() => resetPassword(u.id)}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7}><div className="dd-empty">No users found</div></td></tr>}
            </tbody>
          </table>
        )}
      </div></div>

      {totalPages > 1 && <div className="dd-pagination">
        <button className="dd-btn dd-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span className="dd-page-info">Page {page} of {totalPages} ({total} total)</span>
        <button className="dd-btn dd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}

      {detail && <div className="dd-modal-overlay" onClick={() => setDetail(null)}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <h3>User Detail</h3>
          <div className="sub">{detail.email}</div>
          <table className="dd-table">
            <tbody>
              {Object.entries(detail).map(([k, v]) => (
                <tr key={k}><td style={{ fontWeight: 500, textTransform: "capitalize", width: 140 }}>{k.replace(/_/g, " ")}</td>
                  <td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="dd-modal-actions"><button className="dd-btn" onClick={() => setDetail(null)}>Close</button></div>
        </div>
      </div>}
    </div>
  )
}
