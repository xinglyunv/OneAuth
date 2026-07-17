"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { api } from "@identity/shared"

export default function PasswordPage() {
  const router = useRouter()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  const validate = (): string | null => {
    if (!oldPassword) return "请输入当前密码"
    if (!newPassword) return "请输入新密码"
    if (newPassword.length < 8) return "新密码长度至少为 8 个字符"
    if (newPassword !== confirmPassword) return "两次输入的新密码不一致"
    return null
  }

  const handleChangePassword = async () => {
    setError("")
    setSuccess("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    setSaving(true)
    try {
      await api.changePassword(token, {
        old_password: oldPassword,
        new_password: newPassword,
      })
      setSuccess("密码已成功修改")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "修改密码失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        修改密码
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
          <label className="cc-label" htmlFor="old_password">
            当前密码
          </label>
          <input
            id="old_password"
            className="cc-input"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="输入当前密码"
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label className="cc-label" htmlFor="new_password">
            新密码
          </label>
          <input
            id="new_password"
            className="cc-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 8 个字符"
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label className="cc-label" htmlFor="confirm_password">
            确认新密码
          </label>
          <input
            id="confirm_password"
            className="cc-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
          />
        </div>

        <button
          className="cc-btn cc-btn-primary"
          onClick={handleChangePassword}
          disabled={saving}
        >
          {saving ? "修改中..." : "修改密码"}
        </button>
      </div>
    </div>
  )
}
