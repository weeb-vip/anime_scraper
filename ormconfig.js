// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs')

const useCert = fs.existsSync(`${process.cwd()}/secrets/cert`)
// eslint-disable-next-line @typescript-eslint/ban-types
const ssl = {
  ssl: true,
  extra: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      ...(useCert
        ? {
            ca: fs.readFileSync(`${process.cwd()}/secrets/cert`).toString(),
          }
        : {}),
    },
  },
}

module.exports = {
  type: 'postgres',
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  username: process.env.PGUSERNAME,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ...(process.env.ENV !== 'local' ? ssl : {}),
  synchronize: false,
  ...(process.env.ENV !== 'local'
    ? { entities: ['modules/**/*.entity.{ts,js}'] }
    : { entities: ['dist/modules/**/*.entity.{ts,js}'] }),
  ...(process.env.ENV !== 'local'
    ? {
        migrations: ['migrations/*.{ts,js}'],
      }
    : {
        migrations: ['dist/migrations/*.{ts,js}'],
      }),
  cli: {
    ...(process.env.ENV !== 'local'
      ? {
          migrationsDir: 'migrations',
        }
      : {
          migrationsDir: 'src/migrations',
        }),
  },
}
