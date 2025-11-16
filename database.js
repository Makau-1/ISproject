const { Sequelize } = require('sequelize');
require('dotenv').config();

// ===============================================
// DATABASE CONFIG FOR ALL ENVIRONMENTS
// - Azure:       Uses DATABASE_URL (SSL REQUIRED)
// - Render:      Uses DATABASE_URL (SSL relaxed)
// - Local:       Uses DB credentials from .env
// ===============================================

let sequelize;

if (process.env.DATABASE_URL) {
    // Azure / Render PostgreSQL (hosted)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Azure & Render require relaxed SSL
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    // Local PostgreSQL
    sequelize = new Sequelize(
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
}

// ===============================================
// CONNECT AND TEST DATABASE
// ===============================================
sequelize.authenticate()
    .then(() => {
        console.log('✅ PostgreSQL database connection established successfully');
        console.log(`📊 Connected to database: ${sequelize.config.database}`);
        console.log(`🌐 Host: ${sequelize.config.host}`);
    })
    .catch(err => {
        console.error('❌ Unable to connect to PostgreSQL database:', err.message);
        console.error('💡 Check your DATABASE_URL or local DB credentials');
    });

module.exports = sequelize;