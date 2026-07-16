export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
  device_name?: string
  device_fingerprint?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  session_id: string
  expires_in: number
  token_type: string
  mfa_required?: boolean
  mfa_session_token?: string
}
  export interface UserProfile {
  user_id: string
  username: string
  email: string
  email_verified: boolean
  status: string
  mfa_enabled: boolean
  created_at: string
}

export interface MFAResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface MFASetupResponse {
  secret: string
  qr_code_url: string
}

export interface CreateAppResponse {
  client_id: string
  client_secret: string
  name: string
}

export interface RegisterResponse {
  user_id: string
  email: string
  username: string
  status: string
}

export interface APIError {
  error: string
}

export interface Session {
  session_id: string
  device_name: string
  os: string
  browser: string
  ip_address: string
  is_current: boolean
  created_at: string
}

export interface OAuthApp {
  client_id: string
  name: string
  description: string
  redirect_uris: string[]
  status: string
  created_at: string
}

export interface UserAuthorization {
  client_id: string
  app_name: string
  scopes: string[]
  created_at: string
}