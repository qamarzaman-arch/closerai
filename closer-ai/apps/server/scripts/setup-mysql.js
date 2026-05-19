const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Copy .env.example to .env and set your HeidiSQL/MySQL connection URL.');
  }

  const url = new URL(databaseUrl);
  const database = url.pathname.replace('/', '');

  if (!database) {
    throw new Error('DATABASE_URL must include a database name, for example mysql://root:password@localhost:3306/closer_ai');
  }

  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: false,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  const result = spawnSync('npx.cmd', ['prisma', 'db', 'push'], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error('Prisma db push failed. Check DATABASE_URL credentials and whether MySQL/MariaDB is running.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
