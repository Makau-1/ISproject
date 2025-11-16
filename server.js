const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const sequelize = require('./database');   // Your root-level database.js
const User = require('./user');            // Your root-level user.js

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.enable('trust proxy'); // Azure terminates SSL

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (Your HTML/CSS/JS files in root)
app.use(express.static(__dirname));

// Serve index.html from root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// ============================================
// INPUT VALIDATION HELPERS
// ============================================
const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: 'Username is required' };
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
        return { valid: false, message: 'Username must be 3-50 characters long' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedUsername)) {
        return { 
            valid: false, 
            message: 'Username must start with a letter and contain only letters, numbers, and underscores' 
        };
    }

    return { valid: true, value: trimmedUsername };
};

const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
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

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
        return { valid: false, message: 'Invalid email format' };
    }

    return { valid: true, value: trimmedEmail };
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"]/g, '').trim();
};

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        https: req.secure || req.headers['x-forwarded-proto'] === 'https',
        database: sequelize.authenticate() ? 'Connected' : 'Disconnected'
    });
});

// Get all users (exclude passwords)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json({
            success: true,
            count: users.length,
            users: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching users', 
            error: error.message 
        });
    }
});

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        console.log('📝 Registration attempt:', { username, email: email ? '@' : 'missing' });

        // Validate username
        const vUser = validateUsername(username);
        if (!vUser.valid) {
            console.log('❌ Username validation failed:', vUser.message);
            return res.status(400).json({ 
                success: false,
                message: vUser.message 
            });
        }

        // Validate email (REQUIRED)
        const vEmail = validateEmail(email);
        if (!vEmail.valid) {
            console.log('❌ Email validation failed:', vEmail.message);
            return res.status(400).json({ 
                success: false,
                message: vEmail.message 
            });
        }

        // Validate password
        const vPass = validatePassword(password);
        if (!vPass.valid) {
            console.log('❌ Password validation failed:', vPass.message);
            return res.status(400).json({ 
                success: false,
                message: vPass.message 
            });
        }

        // Sanitize inputs
        const sanitizedUsername = sanitizeInput(vUser.value);
        const sanitizedEmail = sanitizeInput(vEmail.value);

        console.log('✅ All validations passed. Checking for existing user...');

        // Check if user already exists (by username OR email)
        const existingUser = await User.findOne({ 
            where: { 
                [sequelize.Sequelize.Op.or]: [
                    { username: sanitizedUsername },
                    { email: sanitizedEmail }
                ]
            }
        });
        
        if (existingUser) {
            console.log('❌ User already exists');
            return res.status(409).json({ 
                success: false,
                message: 'Username or email already exists' 
            });
        }

        console.log('✅ User does not exist. Creating new user...');

        // Create user (password will be hashed by User model hooks)
        const newUser = await User.create({
            username: sanitizedUsername,
            email: sanitizedEmail,
            password: vPass.value
        });

        console.log('✅ User created successfully:', newUser.id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);

        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.errors.map(e => e.message).join(', ')
            });
        }

        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Error creating user', 
            error: error.message 
        });
    }
});

// Legacy endpoint (for backward compatibility)
app.post('/api/users', async (req, res) => {
    // Redirect to /api/register
    return app._router.handle(
        Object.assign(req, { url: '/api/register', originalUrl: '/api/register' }),
        res
    );
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required' 
            });
        }

        // Sanitize username
        const sanitizedUsername = sanitizeInput(username.trim());

        // Find user
        const user = await User.findOne({ 
            where: { username: sanitizedUsername } 
        });

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username or password' 
            });
        }

        // Verify password using User model method
        const passwordMatch = await user.checkPassword(password);

        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username or password' 
            });
        }

        // Login successful
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Login error', 
            error: error.message 
        });
    }
});

// Delete user by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid user ID' 
            });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        await user.destroy();

        res.json({ 
            success: true,
            message: 'User deleted successfully',
            deletedUser: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting user', 
            error: error.message 
        });
    }
});

// ============================================
// ERROR HANDLERS
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({ 
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================
const PORT = process.env.PORT || 5000;

// Sync database and start server
sequelize.sync({ alter: true }) // Use 'alter' to update schema without dropping tables
    .then(() => {
        console.log('✅ Database connected and synchronized!');
        console.log(`📊 Database: ${sequelize.config.database}`);
        console.log(`🌐 Host: ${sequelize.config.host}`);
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔗 Local: http://localhost:${PORT}`);
            console.log(`🔒 HTTPS: ${process.env.DATABASE_URL ? 'Enabled (Azure)' : 'Disabled (Local)'}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});