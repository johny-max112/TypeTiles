# TypeTiles Admin Dashboard

Administrative dashboard for managing TypeTiles servers, users, and game statistics.

## Features

- **Dashboard**: Overview of server stats, top players, and active games
- **User Management**: Search, ban/unban users, update tiers, reset statistics
- **Leaderboard**: View global and tier-specific rankings with detailed stats
- **Activity Logs**: Audit trail of all admin actions
- **Role-Based Access**: Admin-only protected routes with JWT authentication

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update `VITE_API_URL` to match your backend server URL

## Development

Start the dev server:
```bash
npm run dev
```

Admin dashboard will be available at `http://localhost:5174`

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ Change these credentials in production!

## Build

Build for production:
```bash
npm run build
```

## API Integration

The admin dashboard connects to the TypeTiles API at the configured `VITE_API_URL`.

Required API endpoints:
- `POST /auth/login` - Admin authentication
- `GET /auth/me` - Current user profile
- `GET /admin/dashboard/stats` - Dashboard statistics
- `GET /admin/users` - User list and search
- `POST /admin/users/:id/ban` - Ban user
- `POST /admin/users/:id/unban` - Unban user
- `PUT /admin/users/:id/tier` - Update user tier
- `POST /admin/users/:id/reset-stats` - Reset user statistics
- `GET /admin/logs` - Admin activity logs
- `GET /leaderboard` - Global leaderboard
- `GET /leaderboard/tier/:tier` - Tier-specific leaderboard
