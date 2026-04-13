import db from './src/lib/db.js';

console.log('--- USERS ---');
console.log(db.prepare('SELECT * FROM users').all());

console.log('--- FAMILY MEMBERS ---');
console.log(db.prepare('SELECT * FROM family_members').all());

console.log('--- INVENTORY ---');
console.log(db.prepare('SELECT * FROM inventory').all());

console.log('--- LOGS ---');
console.log(db.prepare('SELECT * FROM logs').all());
