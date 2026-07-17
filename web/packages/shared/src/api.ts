import { GetMeResponse, LoginResponse, MFAResponse, MFASetupResponse, RegisterResponse, UserProfile, OAuthApp, CreateAppResponse, Session } from "./types"

const BASE_URL = typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : ""

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || "request failed")
  }
  return res.json()
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export const api = {
  register: (email: string, username: string, password: string): Promise<RegisterResponse> =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),

  login: (email: string, password: string, deviceName?: string, fingerprint?: string): Promise<LoginResponse> =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, device_name: deviceName, device_fingerprint: fingerprint }) }),

  mfaValidate: (token: string, code: string): Promise<MFAResponse> =>
    request("/api/auth/mfa/validate", { method: "POST", body: JSON.stringify({ mfa_session_token: token, totp_code: code }) }),

  logout: (sessionId: string) =>
    request("/api/auth/logout", { method: "POST", body: JSON.stringify({ session_id: sessionId }) }),

  verifyEmail: (token: string) =>
    request("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),

  forgotPassword: (email: string) =>
    request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password: password }) }),

  getProfile: (token: string): Promise<UserProfile> =>
    request("/api/user/profile", { headers: authHeaders(token) }),

  enableMFA: (token: string): Promise<MFASetupResponse> =>
    request("/api/user/mfa/enable", { method: "POST", headers: authHeaders(token) }),

  disableMFA: (token: string, code: string) =>
    request("/api/user/mfa/disable", { method: "POST", headers: authHeaders(token), body: JSON.stringify({ totp_code: code }) }),

  listSessions: (token: string): Promise<{ sessions: Session[] }> =>
    request("/api/user/sessions", { headers: authHeaders(token) }),

  updateProfile: (token: string, data: { display_name?: string; avatar_url?: string; locale?: string; timezone?: string }) =>
    request("/api/user/profile", { method: "PUT", headers: authHeaders(token), body: JSON.stringify(data) }),

  changePassword: (token: string, data: { old_password: string; new_password: string }) =>
    request("/api/user/password", { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) }),

  revokeSession: (token: string, sessionId: string) =>
    request(`/api/user/sessions/${sessionId}`, { method: "DELETE", headers: authHeaders(token) }),

  listApps: (token: string): Promise<{ apps: OAuthApp[] }> =>
    request("/api/apps", { headers: authHeaders(token) }),

  createApp: (token: string, data: { name: string; description: string; redirect_uris: string[] }): Promise<CreateAppResponse> =>
    request("/api/apps", { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) }),

  listAuthorizedApps: (token: string) =>
    request("/api/user/authorized-apps", { headers: authHeaders(token) }),

  revokeAppAuth: (token: string, clientId: string) =>
    request(`/api/user/authorized-apps/${clientId}`, { method: "DELETE", headers: authHeaders(token) }),

  getMe: (): Promise<GetMeResponse> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
    return request("/api/me", { headers: authHeaders(token || "") })
  },
}