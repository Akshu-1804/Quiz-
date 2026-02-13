const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'quiz_db'
    });

    try {
        const [rows] = await connection.execute('SELECT id, email FROM users');
        console.log('Registered Users:');
        console.table(rows);
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await connection.end();
    }
}

checkUsers();
