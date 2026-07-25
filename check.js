import fs from 'fs';
let sql = fs.readFileSync('FULL_DATABASE_SCHEMA.sql', 'utf8');
let lines = sql.split('\n');
let idx = lines.findIndex(l => l.includes('CREATE TABLE public."User"'));
if (idx !== -1) {
    console.log('Lines around User table creation:');
    for (let i = Math.max(0, idx - 5); i <= idx + 5; i++) {
        console.log(i + ':', lines[i]);
    }
}
