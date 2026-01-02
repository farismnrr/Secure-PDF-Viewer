# Secure File Viewer

A production-ready, secure document viewer for encrypted files. Built with Next.js and designed to display PDF documents and images with multi-tenant SSO authentication.

## Key Features

- **Secure File Handling**: AES-256 encryption for stored documents
- **Multi-format Support**: PDF documents and images (JPG, PNG, WEBP, BMP)
- **SSO Authentication**: Integration with Multi-Tenant User Management Service
- **Role-based Access**: Admin and user role separation
- **Document Management**: Upload, view, and manage encrypted documents
- **Page Rendering**: Server-side PDF rendering with caching for performance

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: PostgreSQL / SQLite (via Drizzle ORM)
- **PDF Rendering**: pdf.js + Canvas
- **Encryption**: AES-256-GCM

## How to Run (Local Development)

### 1. Prerequisites

Ensure you have the following installed:
- **Node.js** 18+
- **npm** or **yarn**
- **Docker** (for database)

### 2. Start Database

```bash
docker run --name postgres-sql -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:alpine
```

### 3. Configuration

```bash
cp .env.example .env
# Edit .env with your SSO URL and Tenant ID
```

Required environment variables:
| Variable | Description |
|----------|-------------|
| `SSO_URL` | URL of the SSO service |
| `TENANT_ID` | Your tenant UUID from SSO |
| `DATABASE_URL` | Database connection string |
| `ENCRYPTION_KEY` | 32-byte hex key for file encryption |

### 4. Database Setup
```bash
make db-generate  # Generate migrations
make db-push      # Push schema to database
```

### 5. Run Application

**Development:**
```bash
make dev
```

**Docker:**
```bash
make start-docker
```

The server will be available at `http://localhost:3000`.

## Available Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make dev` | Run development server |
| `make test` | Run unit tests |
| `make lint` | Run ESLint |
| `make build-docker` | Build Docker image |
| `make start-docker` | Start Docker container |
| `make stop-docker` | Stop Docker container |
| `make push` | Trigger CI/CD build |
| `make push-local` | Build and push multi-arch image |
| `make update` | Update running container (Watchtower) |
| `make db-generate` | Generate database migrations |
| `make db-push` | Push schema changes to DB |
| `make db-studio` | Open database GUI |
| `make key` | Generate encryption key |
| `make encrypt` | Encrypt a PDF file |

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Protected dashboard pages
│   ├── login/         # Login page
│   └── callback/      # SSO callback handler
├── lib/
│   ├── crypto/        # Encryption utilities
│   ├── db/            # Database connection
│   └── services/      # Auth services
├── components/        # UI components
├── services/          # Git submodules
│   └── Multitenant-User-Management-Service/
└── drizzle/           # Database migrations
```

## Supported File Types

| Type | Extensions | MIME Types |
|------|------------|------------|
| PDF | `.pdf` | `application/pdf` |
| JPEG | `.jpg`, `.jpeg` | `image/jpeg` |
| PNG | `.png` | `image/png` |
| WebP | `.webp` | `image/webp` |
| BMP | `.bmp` | `image/bmp` |

## Services

This project includes the following service as a Git submodule:

### Multi-Tenant User Management Service

| Property | Value |
|----------|-------|
| **Location** | `services/Multitenant-User-Management-Service/` |
| **Backend** | Rust + Actix-web |
| **Frontend** | Vue.js + Vite |
| **Database** | PostgreSQL / SQLite |
| **Auth** | JWT (Access + Refresh Tokens) |
| **Features** | Multi-tenant SSO, RBAC, Rate Limiting |

📚 **[Full Documentation](services/Multitenant-User-Management-Service/docs/README.md)**

## SSO Integration

This app uses the User Management Service above for authentication.

**How it works:**
1. User clicks login → redirected to SSO with `tenant_id` + `redirect_uri`
2. SSO generates `state`/`nonce` automatically for security
3. After login, SSO redirects back with `access_token` in URL hash
4. App extracts token and stores in sessionStorage

**Quick Setup:**
1. Create a tenant: `make create-tenant` (in SSO service)
2. Add your domain to `VITE_ALLOWED_ORIGINS` in SSO's `.env`
3. Set `SSO_URL` and `TENANT_ID` in this app's `.env`

## License

Private - All rights reserved.
