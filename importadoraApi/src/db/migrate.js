// migrate.js · Punto de entrada en src/db para ejecutar o consultar migraciones de la base de datos
// conecta con: src/db/migrations/migrator.js

const { runMigrations, createMigration, loadEnv } = require('./migrations/migrator');

if (require.main === module) {
  const result = runMigrations();
  console.log(`[DB Migrate] Base de datos: ${result.registry.database} | Total aplicadas: ${result.registry.totalApplied}`);
  if (result.newlyApplied.length > 0) {
    console.log('[DB Migrate] Nuevas aplicadas:', result.newlyApplied.join(', '));
  } else {
    console.log('[DB Migrate] El esquema está al día. Sin migraciones pendientes.');
  }
}

module.exports = { runMigrations, createMigration, loadEnv };

