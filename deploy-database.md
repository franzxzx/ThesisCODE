# Database Setup Instructions

## Manual Deployment to Supabase

Since the `get_latest_road_status` function is missing from your Supabase database, you need to manually execute the SQL from `database_setup.sql`.

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `twbidxkaxpsqbivghywc`
3. Go to the SQL Editor
4. Copy and paste the contents of `database_setup.sql` 
5. Execute the SQL to create all tables, functions, and policies

### Key Functions to Deploy:

- `get_latest_road_status()` - Returns latest road status by segment
- `log_road_status_update()` - Logs road status updates
- `create_responder_account()` - Creates responder accounts
- `register_responder()` - Registers responders

### Alternative: Use Supabase CLI

If you have Supabase CLI installed:
```bash
supabase db push
```

Or apply migrations:
```bash
supabase db reset
```