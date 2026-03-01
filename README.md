NFI_CMDWS

## Database Mode Status

**Current Status:** DEMO Mode Only (Database disabled)

The application is currently running in DEMO mode exclusively. This means all data is seeded locally and the Supabase database is not used. The database provider code remains intact in the codebase for future re-enablement.

### To Re-Enable Database Mode

1. Set the environment variable:
   ```bash
   VITE_ENABLE_DB_MODE=true
   ```

2. Restart the development server:
   ```bash
   npm run dev
   ```

3. The app will now:
   - Check Supabase connectivity
   - Perform a health check on `app_settings` table
   - Switch to DB mode if the database is healthy
   - Fall back to DEMO mode if the database is unavailable

### To Return to DEMO-Only Mode

Simply remove or set to `false`:
```bash
VITE_ENABLE_DB_MODE=false
```

Then restart the dev server. The navbar badge will show "Demo Only" with a gray indicator.

### Development

- **DEMO Mode:** Uses seeded mock data (MockProvider)
- **DB Mode:** Uses Supabase backend (DbProvider)
- **Feature Flag:** `VITE_ENABLE_DB_MODE` environment variable (defaults to false)
- **Force DEMO:** localStorage key `nfi_force_demo_mode` (set to 'true' to force DEMO regardless of DB availability)
