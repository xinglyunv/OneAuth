"use client"
import { useEffect, useState } from "react"
import { api, UserProfile } from "@identity/shared"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { window.location.href = "http://localhost:3001/login"; return }
    api.getProfile(token).then(p => { setProfile(p); setDisplayName(p.profile?.display_name || p.username || ""); setAvatarUrl(p.profile?.avatar_url || "") }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await api.updateProfile(token, { display_name: displayName, avatar_url: avatarUrl })
      setSuccess("资料已更新")
      setEditing(false)
      // Refresh profile
      const p = await api.getProfile(token)
      setProfile(p)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "更新失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="cc-card" style={{ padding: "2rem", textAlign: "center" }}><div className="cc-skeleton" style={{ width: "100%", height: 160 }} /></div>
  if (!profile) return <div className="cc-alert cc-alert-error">加载失败，请重新登录</div>

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>个人资料</h2>

      {error && <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}

      <div className="cc-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem", color: "var(--cc-primary)", flexShrink: 0 }}>
            {(profile.profile?.display_name || profile.username || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{profile.profile?.display_name || profile.username}</div>
            <div style={{ color: "var(--cc-text-secondary)", fontSize: "0.875rem" }}>@{profile.username} · {profile.email}</div>
          </div>
				  <span className={profile.email_verified ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"} style={{ marginLeft: "auto" }}>
					  {profile.email_verified ? "已验证" : "未验证"}
          </span>
        </div>

        {editing ? (
          <div>
            <label className="cc-label">显示名称</label>
            <input className="cc-input" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ marginBottom: "0.75rem" }} />
            <label className="cc-label">头像 URL</label>
            <input className="cc-input" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} style={{ marginBottom: "1rem" }} placeholder="https://..." />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="cc-btn cc-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
              <button className="cc-btn cc-btn-ghost" onClick={() => setEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div><div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>用户 ID</div><div style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{profile.user_id.slice(0, 12)}...</div></div>
            <div><div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>状态</div><span className={profile.status === "active" ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}>{profile.status}</span></div>
            <div><div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>MFA</div><span className={profile.mfa_enabled ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"}>{profile.mfa_enabled ? "已开启" : "未开启"}</span></div>
            <div><div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>注册时间</div><div>{new Date(profile.created_at).toLocaleDateString("zh-CN")}</div></div>
          </div>
        )}

        {!editing && (
          <button className="cc-btn cc-btn-secondary" style={{ marginTop: "1rem" }} onClick={() => setEditing(true)}>
            编辑资料
          </button>
        )}
      </div>
    </div>
  )
}
