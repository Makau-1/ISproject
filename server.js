const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
const User = require('./models/user');
require('dotenv').config();

const app = express();

// Trust proxy (important for Render to detect HTTPS)
app.enable('trust proxy');

// ============================================
// HTTPS REDIRECT MIDDLEWARE (Step 4 Requirement)
// ============================================
app.use((req, res, next) => {
    // Check if request is not secure (HTTP)
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        // Redirect to HTTPS
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ============================================
// API Routes with Password Hashing & Validation
// ============================================

// Input validation helper functions
const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: 'Username is required' };
    }
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return { valid: false, message: 'Username must be 3-30 characters long' };
    }
    
    // Must start with letter, only letters/numbers/underscores
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
    
    // Check for uppercase, lowercase, number, and special character
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

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"]/g, '');
};

// GET all users (exclude passwords from response)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] } // Never send passwords to client
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// POST new user (with password hashing and validation)
app.post('/api/users', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // ============================================
        // INPUT VALIDATION (Step 5 Requirement)
        // ============================================
        
        // Validate username
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
            return res.status(400).json({ message: usernameValidation.message });
        }
        
        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ message: passwordValidation.message });
        }
        
        // Sanitize inputs
        const sanitizedUsername = sanitizeInput(usernameValidation.value);
        
        // Check if username already exists
        const existingUser = await User.findOne({ 
            where: { username: sanitizedUsername } 
        });
        
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }
        
        // ============================================
        // PASSWORD HASHING (Step 5 Requirement)
        // ============================================
        
        // Hash password with bcrypt (cost factor of 12)
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(passwordValidation.value, saltRounds);
        
        // Create user with hashed password
        const newUser = await User.create({ 
            username: sanitizedUsername, 
            password: hashedPassword 
        });
        
        // Return user without password
        const userResponse = {
            id: newUser.id,
            username: newUser.username,
            createdAt: newUser.createdAt
        };
        
        res.status(201).json({ 
            message: 'User registered successfully',
            user: userResponse 
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// LOGIN endpoint (verify hashed password)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate inputs
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        // Sanitize username
        const sanitizedUsername = sanitizeInput(username.trim());
        
        // Find user by username
        const user = await User.findOne({ 
            where: { username: sanitizedUsername } 
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // ============================================
        // VERIFY HASHED PASSWORD (Step 5 Requirement)
        // ============================================
        
        // Compare provided password with hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // Login successful
        res.json({ 
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username
            }
        });
        
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Login error', error: error.message });
    }
});

// DELETE user (optional - for testing)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await user.destroy();
        res.json({ message: 'User deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        https: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
    console.log('✅ Database connected and tables synced!');
}).catch(err => {
    console.error('❌ Database sync error:', err);
    process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});