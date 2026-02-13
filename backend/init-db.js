const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    // Connect without database selected first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        const dbName = process.env.DB_NAME || 'quiz_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, '..', 'frontend', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await connection.query(schema);

        console.log('Database and tables created successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await connection.end();
    }
}

setupDatabase();
