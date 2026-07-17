"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
import type { UserProfile } from "@identity/shared"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [locale, setLocale] = useState("")
  const [timezone, setTimezone] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    api
      .getProfile(token)
      .then((p: UserProfile) => {
        setProfile(p)
        setDisplayName(p.profile?.display_name || "")
        setAvatarUrl(p.profile?.avatar_url || "")
        setLocale(p.profile?.locale || "")
        setTimezone(p.profile?.timezone || "")
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  const handleSave = async () => {
    setError("")
    setSuccess("")
    setSaving(true)

    const token = localStorage.getItem("access_token") || ""
    try {
      await api.updateProfile(token, {
        display_name: displayName || undefined,
        avatar_url: avatarUrl || undefined,
        locale: locale || undefined,
        timezone: timezone || undefined,
      })
      setSuccess("个人资料已更新")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  if (!profile && error) {
    return <div className="cc-alert cc-alert-error">{error}</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        个人资料
      </h2>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="cc-alert cc-alert-success" style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      <div className="cc-card" style={{ padding: "1.5rem" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <label className="cc-label" htmlFor="display_name">
            显示名称
          </label>
          <input
            id="display_name"
            className="cc-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="输入您的显示名称"
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label className="cc-label" htmlFor="avatar_url">
            头像 URL
          </label>
          <input
            id="avatar_url"
            className="cc-input"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label className="cc-label" htmlFor="locale">
            语言/地区
          </label>
          <input
            id="locale"
            className="cc-input"
            type="text"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            placeholder="zh-CN"
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label className="cc-label" htmlFor="timezone">
            时区
          </label>
          <input
            id="timezone"
            className="cc-input"
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Shanghai"
          />
        </div>

        <button
          className="cc-btn cc-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存修改"}
        </button>
      </div>
    </div>
  )
}
