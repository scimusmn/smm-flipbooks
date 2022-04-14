/* eslint no-console: 0 */
require('dotenv').config({
  path: '.env.development',
});

const { execSync } = require('child_process');
const readline = require('readline');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');

function performMigration(environment, migrationPath) {
  console.log(`Running migration file: "${migrationPath}"...`);

  execSync(`
      contentful space migration \
      --environment-id ${environment} \
      --management-token ${process.env.CONTENTFUL_MANAGEMENT_TOKEN} \
      --space-id ${process.env.CONTENTFUL_SPACE_ID} \
      --yes \
      ${migrationPath}
    `, { stdio: 'inherit' });

  console.log(`Migration file: "${migrationPath}" completed.`);
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('close', () => {
  console.log('\nBYE BYE !!!');
  process.exit(0);
});

// Ensure that the user has provided the required arguments
if (argv._.length < 1) {
  console.error(chalk.red('Error: No migration file specified.'));
  process.exit(0);
} else {
  const migrationPath = argv._[0];
  performMigration(process.env.CONTENTFUL_ENVIRONMENT, migrationPath);
}
