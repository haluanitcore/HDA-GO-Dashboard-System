import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
    databaseDir: 'd:/pg-data-hdago',
    user: 'hdago_admin',
    password: 'hdago123',
    port: 5432,
    persistent: true,
});

console.log('Initialising PostgreSQL...');
await pg.initialise();

console.log('Starting PostgreSQL server on port 5432...');
await pg.start();

console.log('Creating database hdago_dev...');
try {
    await pg.createDatabase('hdago_dev');
    console.log('Database hdago_dev created.');
} catch(e) {
    console.log('Database may exist:', e.message);
}

console.log('✅ PostgreSQL running — localhost:5432 | user: hdago_admin | pass: hdago123 | db: hdago_dev');

process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
});

await new Promise(() => {});
