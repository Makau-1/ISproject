const { DataTypes } = require('sequelize');
const sequelize = require('./database');  // Points to root-level database.js
const bcrypt = require('bcrypt');

// ===============================================
// USER MODEL WITH PASSWORD HASHING & VALIDATION
// ===============================================
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'Username already exists'
    },
    validate: {
      len: {
        args: [3, 50],
        msg: 'Username must be between 3 and 50 characters'
      },
      isAlphanumeric: {
        msg: 'Username can only contain letters and numbers'
      },
      notEmpty: {
        msg: 'Username cannot be empty'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Email already exists'
    },
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      },
      notEmpty: {
        msg: 'Email cannot be empty'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [8, 255],
        msg: 'Password must be at least 8 characters'
      },
      notEmpty: {
        msg: 'Password cannot be empty'
      }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,  // Adds createdAt and updatedAt
  hooks: {
    // Hash password before creating new user
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hash password before updating user
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// ===============================================
// INSTANCE METHOD: CHECK/VERIFY PASSWORD
// ===============================================
User.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Alternative method name (same functionality)
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;