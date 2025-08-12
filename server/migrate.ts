import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    console.log("Iniciando migração...");

    // Adicionar coluna price à tabela exam_types
    await db.execute(sql`
      ALTER TABLE exam_types 
      ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0
    `);

    // Adicionar coluna price à tabela consultation_types
    await db.execute(sql`
      ALTER TABLE consultation_types 
      ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0
    `);

    // Criar tabela de logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id INTEGER,
        activity_type VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        related_table VARCHAR(255),
        related_id INTEGER
      );
    `);

    // Create sessions table for express-session
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
    `);

    // Create activity_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        request_id INTEGER,
        patient_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        action_description TEXT,
        request_type VARCHAR(50),
        request_name VARCHAR(255),
        old_status VARCHAR(100),
        new_status VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Migração concluída com sucesso!");
  } catch (error) {
    console.error("Erro na migração:", error);
  }
}

migrate();