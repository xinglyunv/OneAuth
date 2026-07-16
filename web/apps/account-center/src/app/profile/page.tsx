"use client"
import { useEffect, useState } from "react"
import { api, UserProfile } from "@identity/shared"
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { window.location.href = "http://localhost:3001/login"; return }
    api.getProfile(token).then(setProfile).catch(() => { window.location.href = "http://localhost:3001/login" }).finally(() => setLoading(false))
  }, [])
  if (loading) return <p>加载中...</p>
  if (!profile) return <p>请先登录</p>
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>个人资料</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <div><strong>用户ID：</strong>{profile.user_id}</div>
        <div><strong>用户名：</strong>{profile.username}</div>
        <div><strong>邮箱：</strong>{profile.email} {profile.email_verified ? "✓" : "（未验证）"}</div>
        <div><strong>状态：</strong>{profile.status}</div>
        <div><strong>MFA：</strong>{profile.mfa_enabled ? "已开启" : "未开启"}</div>
      </div>
    </div>
  )
}
