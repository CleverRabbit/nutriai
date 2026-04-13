import db from './src/lib/db.js';
import bcrypt from 'bcryptjs';

async function test() {
  const email = 'test@example.com';
  const password = await bcrypt.hash('password', 10);
  
  console.log('Inserting user...');
  const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, password);
  console.log('Insert result:', result);
  
  console.log('Verifying...');
  const users = db.prepare('SELECT * FROM users').all();
  console.log('Users in DB:', users);
}

test();
