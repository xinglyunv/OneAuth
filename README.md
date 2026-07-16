# OneAuth

Unified identity platform with OAuth 2.1 / OpenID Connect, MFA, SSO.

## Features

- User registration, login, and password management
- OAuth 2.1 Authorization Code Flow with PKCE
- OpenID Connect (OIDC) discovery and ID tokens
- TOTP multi-factor authentication
- Device management and session tracking
- Email verification and password reset
- Refresh token rotation with replay detection
- Admin and developer consoles

## Tech Stack

- **Backend**: Go 1.24+, Gin, gRPC, Ent ORM, Argon2id
- **Database**: PostgreSQL 16, Redis 7
- **Frontend**: Next.js 15 (TypeScript, TailwindCSS, shadcn/ui, TanStack Query)
- **Protocols**: OAuth 2.1, OpenID Connect, PKCE, JWT RS256

## Architecture

```
Gateway (Gin) → gRPC → Auth Service
                     → OAuth2 Service
                     → User Service
```

## Quick Start

```bash
# Generate Ent code
go generate ./internal/ent/...

# Run server
go run ./cmd/server

# Install frontend dependencies
cd web && pnpm install

# Start frontend dev servers
pnpm dev
```

## Project Structure

```
cmd/server/        Server entry point
config/            Application configuration
internal/          Core services (auth, oauth2, user, gateway)
migrations/        Database migrations
proto/             Protobuf definitions
sdk/               Go SDK for OAuth 2.1 client
web/               Frontend applications
dev/               Development configs and specs
```

## Documentation

SDK documentation and integration examples are in `sdk/`. Frontend apps are in `web/apps/`.

## License

MIT
