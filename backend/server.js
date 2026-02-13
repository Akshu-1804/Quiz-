const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Email Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
db.getConnection((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Successfully connected to MySQL');
    }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Registration attempt for: ${email}`);
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.promise().query(
            'INSERT INTO users (email, password) VALUES (?, ?)',
            [email, hashedPassword]
        );
        console.log(`User registered successfully: ${email}`);
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            console.log(`Login failed: User ${email} not found`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        console.log(`Login successful for: ${email}`);
        res.json({ message: 'Login successful', email: user.email, userId: user.id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit Score
app.post('/api/scores', async (req, res) => {
    const { email, score, topic } = req.body;
    try {
        const [users] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
        const userId = users[0].id;
        await db.promise().query(
            'INSERT INTO scores (user_id, score, topic) VALUES (?, ?, ?)',
            [userId, score, topic]
        );

        // Send Result Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Quiz Results: ${topic}`,
            html: `<h2>Quiz Completed!</h2><p>Topic: ${topic}</p><p>Your Score: <strong>${score}%</strong></p>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error('Error sending email:', err);
            else console.log('Email sent:', info.response);
        });

        res.status(201).json({ message: 'Score saved successfully' });
    } catch (error) {
        console.error('Save score error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User History
app.get('/api/scores/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const [history] = await db.promise().query(
            'SELECT s.score, s.topic, s.timestamp FROM scores s JOIN users u ON s.user_id = u.id WHERE u.email = ? ORDER BY s.timestamp DESC',
            [email]
        );
        res.json(history);
    } catch (error) {
        console.error('Error fetching user history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
