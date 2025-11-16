const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const sequelize = require('./database');   // FIXED: matches your root file
const User = require('./user');            // FIXED: matches your root file

const app = express();

// Azure already terminates SSL, no redirect needed
app.enable('trust proxy');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// STATIC FILES (Your project is in the root)
// ============================================
app.use(express.static(__dirname));

// Serve index.html from root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// ============================================
// USERNAME & PASSWORD VALIDATION HELPERS
// (same as your original code)
// ============================================
const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: 'Username is required' };
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return { valid: false, message: 'Username must be 3-30 characters long' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedUsername)) {
        return { valid: false, message: 'Username must start with a letter and contain only letters, numbers, and underscores' };
    }

    return { valid: true, value: trimmedUsername };
};

const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long' };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        return {
            valid: false,
            message: 'Password must include uppercase, lowercase, number, and special character'
        };
    }

    return { valid: true, value: password };
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"]/g, '');
};


// ============================================
// API ROUTES
// ============================================

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});


// Register user
app.post('/api/users', async (req, res) => {
    try {
        const { username, password } = req.body;

        const vUser = validateUsername(username);
        if (!vUser.valid) return res.status(400).json({ message: vUser.message });

        const vPass = validatePassword(password);
        if (!vPass.valid) return res.status(400).json({ message: vPass.message });

        const sanitizedUsername = sanitizeInput(vUser.value);

        const existingUser = await User.findOne({ where: { username: sanitizedUsername } });
        if (existingUser) return res.status(409).json({ message: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(vPass.value, 12);

        const newUser = await User.create({
            username: sanitizedUsername,
            password: hashedPassword
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});


// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ message: 'Username and password are required' });

        const sanitizedUsername = sanitizeInput(username.trim());

        const user = await User.findOne({ where: { username: sanitizedUsername } });
        if (!user) return res.status(401).json({ message: 'Invalid username or password' });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: 'Invalid username or password' });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Login error', error: error.message });
    }
});


// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await user.destroy();
        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});


// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        https: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    res.status(500).json({ message: 'Internal server error' });
});

// Start server after DB sync
sequelize.sync({ force: false })
    .then(() => console.log('Database connected!'))
    .catch(err => console.error('Database error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});