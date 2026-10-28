// migrator.js · Motor de migraciones SQL para PostgreSQL con control de versiones, checksum y registro local/BD
// conecta con: importadoraApi/.env, src/db/startDb.pgsql, src/db/migrations/*.pgsql y applied_migrations.json

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const MIGRATIONS_DIR = __dirname;
const DB_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.resolve(__dirname, '../../../.env');
const APPLIED_LOG_PATH = path.join(MIGRATIONS_DIR, 'applied_migrations.json');
const BASELINE_FILE = path.join(DB_DIR, 'startDb.pgsql');

function loadEnv(envPath = ENV_PATH) {
  const config = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) config[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return {
    host: process.env.DB_HOST || config.DB_HOST || 'localhost',
    port: process.env.DB_PORT || config.DB_PORT || '5432',
    database: process.env.DB_DATABASE || config.DB_DATABASE || 'Importadora',
    user: process.env.DB_USER || config.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || config.DB_PASSWORD || '',
  };
}

function resolvePsqlBin() {
  if (process.env.PSQL_BIN && fs.existsSync(process.env.PSQL_BIN)) return process.env.PSQL_BIN;
  const pgRoot = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(pgRoot)) {
    const versions = fs.readdirSync(pgRoot).sort((a, b) => Number(b) - Number(a));
    for (const ver of versions) {
      const candidate = path.join(pgRoot, ver, 'bin', 'psql.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return 'psql';
}

function runPsql(dbConfig, args) {
  const psqlBin = resolvePsqlBin();
  return execFileSync(
    psqlBin,
    ['-h', dbConfig.host, '-p', String(dbConfig.port), '-U', dbConfig.user, '-d', dbConfig.database, '-v', 'ON_ERROR_STOP=1', ...args],
    {
      env: { ...process.env, PGPASSWORD: dbConfig.password, PGCLIENTENCODING: 'UTF8' },
      encoding: 'utf8',
    }
  );
}

function computeChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function ensureMigrationsTable(db) {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations(
      id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      version           TEXT NOT NULL UNIQUE,
      name              TEXT NOT NULL,
      filename          TEXT NOT NULL,
      checksum          TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      applied_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  runPsql(db, ['-q', '-c', sql]);
}

function fetchAppliedFromDb(db) {
  const sql = `SELECT COALESCE(json_agg(row_to_json(t) ORDER BY version), '[]'::json)::text FROM (SELECT version, name, filename, checksum, execution_time_ms, applied_at FROM schema_migrations ORDER BY version) t;`;
  const out = runPsql(db, ['-t', '-A', '-c', sql]).trim();
  return JSON.parse(out || '[]');
}

function syncAppliedJson(db, appliedRows) {
  const payload = {
    database: db.database,
    host: db.host,
    lastSyncedAt: new Date().toISOString(),
    totalApplied: appliedRows.length,
    migrations: appliedRows,
  };
  fs.writeFileSync(APPLIED_LOG_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return payload;
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.(pgsql|sql)$/i.test(f))
    .sort()
    .map((filename) => {
      const match = filename.match(/^(\d{3})_(.+)\.(pgsql|sql)$/i);
      const fullPath = path.join(MIGRATIONS_DIR, filename);
      return {
        version: match[1],
        name: match[2],
        filename,
        fullPath,
        checksum: computeChecksum(fullPath),
      };
    });
}

function registerBaselineIfPresent(db, appliedMap) {
  if (appliedMap.has('000') || !fs.existsSync(BASELINE_FILE)) return;
  const checkTables = runPsql(db, ['-t', '-A', '-c', `SELECT to_regclass('public.companies') IS NOT NULL;`]).trim();
  if (checkTables === 't') {
    const checksum = computeChecksum(BASELINE_FILE);
    const insertSql = `INSERT INTO schema_migrations(version, name, filename, checksum, execution_time_ms) VALUES ('000', 'initial_v10_schema', 'startDb.pgsql', '${checksum}', 0) ON CONFLICT (version) DO NOTHING;`;
    runPsql(db, ['-q', '-c', insertSql]);
  }
}

function runMigrations() {
  const db = loadEnv();
  ensureMigrationsTable(db);
  let appliedRows = fetchAppliedFromDb(db);
  const appliedMap = new Map(appliedRows.map((r) => [r.version, r]));

  registerBaselineIfPresent(db, appliedMap);
  appliedRows = fetchAppliedFromDb(db);
  const currentMap = new Map(appliedRows.map((r) => [r.version, r]));

  const files = listMigrationFiles();
  const newlyApplied = [];

  for (const mig of files) {
    const existing = currentMap.get(mig.version);
    if (existing) {
      if (existing.checksum !== mig.checksum) {
        throw new Error(`Checksum inválido en migración ya aplicada ${mig.filename} (BD: ${existing.checksum.slice(0, 12)} vs Archivo: ${mig.checksum.slice(0, 12)})`);
      }
      continue;
    }
    const start = Date.now();
    runPsql(db, ['-q', '-f', mig.fullPath]);
    const elapsed = Date.now() - start;
    const recordSql = `INSERT INTO schema_migrations(version, name, filename, checksum, execution_time_ms) VALUES ('${mig.version}', '${mig.name}', '${mig.filename}', '${mig.checksum}', ${elapsed});`;
    runPsql(db, ['-q', '-c', recordSql]);
    newlyApplied.push(mig.filename);
  }

  const finalRows = fetchAppliedFromDb(db);
  const registry = syncAppliedJson(db, finalRows);
  return { newlyApplied, registry };
}

function createMigration(rawName) {
  if (!rawName) throw new Error('Debes indicar el nombre de la migración: node migrator.js create <nombre>');
  const files = listMigrationFiles();
  const lastVer = files.length > 0 ? Number(files[files.length - 1].version) : 0;
  const nextVer = String(lastVer + 1).padStart(3, '0');
  const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const filename = `${nextVer}_${cleanName}.pgsql`;
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const template = `-- ${filename} · Migración de actualización\n-- conecta con: src/db/migrations/migrator.js\n\nBEGIN;\n\n-- Escribe aquí tus sentencias DDL / DML de actualización\n\nCOMMIT;\n`;
  fs.writeFileSync(fullPath, template, 'utf8');
  return fullPath;
}

if (require.main === module) {
  const cmd = (process.argv[2] || 'up').toLowerCase();
  if (cmd === 'create') {
    const created = createMigration(process.argv.slice(3).join('_'));
    console.log(`Migración creada: ${created}`);
  } else if (cmd === 'status') {
    const db = loadEnv();
    ensureMigrationsTable(db);
    const applied = fetchAppliedFromDb(db);
    syncAppliedJson(db, applied);
    console.table(applied);
  } else {
    const res = runMigrations();
    console.log(`Migraciones ejecutadas nuevas: ${res.newlyApplied.length}`, res.newlyApplied);
    console.table(res.registry.migrations);
  }
}

module.exports = { runMigrations, createMigration, loadEnv };

