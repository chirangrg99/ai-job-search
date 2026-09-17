# Server boundary

Environment validation, Supabase SSR access and authentication guards live here. Import the typed cookie client for RLS-scoped queries. Every future data action must call `requireUser()` and derive ownership from its result. Never accept a browser owner ID or use a service-role client for ordinary user operations.
