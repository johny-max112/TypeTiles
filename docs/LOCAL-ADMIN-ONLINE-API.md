# Local Admin with the online Render API

15 November 2026. The Admin UI can stay at `http://localhost:5174` while using the online database through Render. No local backend is required for this arrangement.

## Setup

1. In `admin/.env.local`, keep `VITE_API_URL=https://api.playtypetiles.com/api`. The root frontend environment file is separate.
2. In Render backend environment, append `http://localhost:5174` to `CLIENT_ORIGINS` (comma-separated). Preserve any existing allowed origins. Keep `CLIENT_URL=https://playtypetiles.com`, production NODE_ENV and `AUTH_COOKIE_SAME_SITE=lax` unchanged. Save/redeploy the environment configuration. No API secret is added to the Admin frontend.
3. Restart the Admin dev server from the Admin directory (`npm run dev`) or run `npm run dev --prefix admin` from the repository root.
4. Open exactly `http://localhost:5174/login`. Use the existing verified Admin account from the online database.

## Flow

Browser -> localhost:5174/api -> Vite development proxy -> HTTPS Render API -> existing Supabase database.

During Vite development, the API client uses relative `/api` requests and cookies remain same-origin to the browser. The server-side proxy target comes from the Admin VITE_API_URL. Production builds still use the configured public API URL directly; the proxy is not part of the production Admin bundle.

The proxy preserves the real localhost Origin and the CSRF header. It does not impersonate the production frontend Origin or bypass backend authorization. Render must explicitly allow localhost in CLIENT_ORIGINS. An Origin preflight check before this change did not return an allow-origin header for localhost; the live setting must be checked after updating it.

The remote production session cookie remains HttpOnly/Secure/host-only on Render. On the **loopback HTTP leg only**, the development proxy renames it to `typetiles_admin_proxy_prod` and removes Secure/Domain while retaining HttpOnly, expiry, SameSite and Path. It maps that isolated local cookie back to its original name for HTTPS requests to Render. This avoids relying on browser handling of Secure/__Host cookies over local HTTP. Logout uses the same mapping to expire the local cookie. A local-development backend cookie is mapped to a separate `typetiles_admin_proxy_dev` name. Unrelated localhost cookies and Authorization headers are not forwarded.

This local session is a production credential: use a trusted computer/browser profile. Other applications on localhost may share the cookie host because cookies are not port-isolated. Never expose this development server to a LAN, tunnel, public host or reverse proxy. It binds to localhost, requires port 5174, validates the exact Host, rejects foreign Origin headers, and requires the custom header for mutations. Upstream TLS verification stays enabled; remote HTTP targets are rejected. Do not add `--host 0.0.0.0`.

Admin actions still operate on **production data**. No schema, account role, password or hosted cookie policy is changed. Production logout remains global through session_version.

## Validation

`server/tests/adminProxy.test.ts` checks cookie round trip, logout clearing, dropped unrelated cookies/Bearer headers, preserved Origin/CSRF, HTTPS target validation and rejection of hostile Host/Origin/missing-CSRF requests against isolated HTTP fixtures. Run `npm exec --prefix server -- tsx --test server/tests/adminProxy.test.ts`. Admin TypeScript/Vite build is also checked. These tests do not log into a real production account; after allowlisting localhost, verify login -> reload -> Admin data -> logout manually.

If login fails, inspect the local `/api/auth/login` response. A 403 origin/CSRF error means Render's localhost allowlist is not applied or the request is from another origin/port. A 401 Invalid username or password is an account/credentials issue. A 429 requires waiting for Retry-After. Do not repeatedly guess passwords or disable cookie security to diagnose it.
