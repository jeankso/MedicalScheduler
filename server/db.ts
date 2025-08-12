import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Configuração para servidor PostgreSQL dedicado 177.87.15.68
const DATABASE_URL = "postgresql://neondb_owner:npg_KDW1qAiQF3fX@177.87.15.68:5432/neondb";

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: false, // Servidor local não precisa de SSL
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });