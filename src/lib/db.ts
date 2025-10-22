// Neon client (serverless Postgres)
import { neon } from "@neondatabase/serverless";

// pastikan DATABASE_URL ada di .env.local / vercel env
export const sql = neon(process.env.DATABASE_URL!);
