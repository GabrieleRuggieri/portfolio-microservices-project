/**
 * User Model
 * Defines the user schema and methods for authentication
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');
const config = require('../config/auth.config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 30],
            is: /^[a-zA-Z0-9_\-\.]+$/i
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    roles: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [config.roles.default]
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    verificationToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    accountLocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lockUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    passwordChangedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    profileImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    githubId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'users',
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['username']
        }
    ]
});

/**
 * Get permissions for a user based on their roles
 * @returns {Array} Array of permissions
 */
User.prototype.getPermissions = function () {
    const allPermissions = new Set();

    // Add permissions for each role
    if (this.roles && Array.isArray(this.roles)) {
        this.roles.forEach(role => {
            const rolePermissions = config.roles.permissions[role] || [];
            rolePermissions.forEach(permission => allPermissions.add(permission));
        });
    }

    return Array.from(allPermissions);
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean} True if user has the role
 */
User.prototype.hasRole = function (role) {
    return this.roles && Array.isArray(this.roles) && this.roles.includes(role);
};

/**
 * Add a role to user
 * @param {string} role - Role to add
 * @returns {boolean} True if role was added
 */
User.prototype.addRole = async function (role) {
    if (!config.roles.available.includes(role)) {
        throw new Error(`Invalid role: ${role}`);
    }

    if (!this.roles.includes(role)) {
        this.roles.push(role);
        await this.save();
        return true;
    }

    return false;
};

/**
 * Remove a role from user
 * @param {string} role - Role to remove
 * @returns {boolean} True if role was removed
 */
User.prototype.removeRole = async function (role) {
    if (this.roles.includes(role)) {
        this.roles = this.roles.filter(r => r !== role);
        await this.save();
        return true;
    }

    return false;
};

/**
 * Check if user account is locked
 * @returns {boolean} True if account is locked
 */
User.prototype.isAccountLocked = function () {
    // Account is not locked
    if (!this.accountLocked) {
        return false;
    }

    // If lock until date is set and has passed, account is no longer locked
    if (this.lockUntil && new Date() > this.lockUntil) {
        return false;
    }

    // Account is locked
    return true;
};

/**
 * Transform user object when converting to JSON
 * @returns {Object} Transformed user object
 */
User.prototype.toJSON = function () {
    const values = { ...this.get() };

    // Add calculated fields
    values.permissions = this.getPermissions();
    values.fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim() || null;

    return values;
};

module.exports = User;