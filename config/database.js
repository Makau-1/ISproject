const { Sequelize } = require('sequelize');
require('dotenv').config();

// Primary connection method: Use DATABASE_URL
// This works for both local development (External URL) and Render production (Internal URL)
const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false, // Set to true for debugging SQL queries
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Required for Render PostgreSQL
            }
        },
        pool: {
            max: 5,          // Maximum number of connections
            min: 0,          // Minimum number of connections
            acquire: 30000,  // Max time (ms) to get connection before error
            idle: 10000      // Max time (ms) connection can be idle before release
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'isprojectdb',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );

// Test database connection on startup
sequelize.authenticate()
    .then(() => {
        console.log('✅ PostgreSQL database connection established successfully');
        console.log(`📊 Connected to database: ${sequelize.config.database}`);
        console.log(`🌐 Host: ${sequelize.config.host}`);
    })
    .catch(err => {
        console.error('❌ Unable to connect to PostgreSQL database:', err.message);
        console.error('💡 Check your DATABASE_URL in .env file');
        console.error('💡 Make sure PostgreSQL database is running on Render');
    });

module.exports = sequelize;