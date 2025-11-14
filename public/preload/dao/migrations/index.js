const migration_1_0_to_2_0 = require('./1.0-to-2.0')

function registerAllMigrations(migrationRunner) {
  migrationRunner.registerMigration(
    migration_1_0_to_2_0.fromVersion,
    migration_1_0_to_2_0.toVersion,
    migration_1_0_to_2_0.migrate
  )
}

module.exports = {
  registerAllMigrations
}
