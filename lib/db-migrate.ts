import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

interface Migration {
  version: number;
  filename: string;
  executed_at?: Date;
}

let sql: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    sql = postgres(url);
  }
  return sql;
}

export async function runMigrations() {
  const db = getDb();
  
  try {
    // Ensure migrations table exists
    await db`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Get applied migrations
    const applied = await db`SELECT version FROM schema_migrations ORDER BY version`;
    const appliedVersions = new Set(applied.map(r => r.version as number));

    // Find migration files
    const migrationsDir = path.join(process.cwd(), 'db');
    if (!fs.existsSync(migrationsDir)) {
      if (process.env.NODE_ENV !== 'production') console.log('No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.match(/^\d+_.*\.sql$/))
      .sort();

    // Run pending migrations
    for (const file of files) {
      const match = file.match(/^(\d+)/);
      if (!match) continue;

      const version = parseInt(match[1], 10);
      if (appliedVersions.has(version)) {
        if (process.env.NODE_ENV !== 'production') console.log(`✓ Migration ${version} already applied`);
        continue;
      }

      const filepath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');

      if (process.env.NODE_ENV !== 'production') console.log(`Running migration ${version}: ${file}`);
      // Execute migration SQL statements
      const statements = content.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await db.unsafe(statement);
        }
      }

      // Record migration
      await db`
        INSERT INTO schema_migrations (version, filename)
        VALUES (${version}, ${file})
      `;
      if (process.env.NODE_ENV !== 'production') console.log(`✓ Migration ${version} completed`);
    }

    if (process.env.NODE_ENV !== 'production') console.log('All migrations completed successfully');
  } catch (error) {
    console.error('[Migration Error]:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Run on server startup if not already running
let migrationLock = false;

export async function ensureMigrationsRun() {
  if (migrationLock || process.env.SKIP_MIGRATIONS === 'true') return;
  migrationLock = true;

  try {
    await runMigrations();
  } catch (error) {
    console.error('[Migration Failed]:', error instanceof Error ? error.message : String(error));
    // Don't crash the server, just log
  }
}
