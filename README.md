# CareerBridge

## Account setup

Configure `DATABASE_URL` for the PostgreSQL database, then apply `src/app/auth-schema.sql` to that database before enabling sign-up or sign-in. The application checks that its tables exist but does not apply schema changes automatically.
