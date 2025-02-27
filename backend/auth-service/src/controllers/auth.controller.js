/**
 * Authentication Controller
 * Handles user registration, login, token management, and authentication flows
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const { generateTokens, verifyToken, getPublicKey } = require('../utils/jwt.util');
const { validatePassword, validateEmail } = require('../utils/validation.util');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email.util');
const config = require('../config/auth.config');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, UNAUTHORIZED, BAD_REQUEST, NOT_FOUND, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Register a new user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const register = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(BAD_REQUEST).json(
                formatError('Validation Error', 'Invalid email format')
            );
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(BAD_REQUEST).json(
                formatError('Validation Error', passwordValidation.message)
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [User.sequelize.Op.or]: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(BAD_REQUEST).json(
                formatError('Registration Error', 'Username or email already exists')
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, config.password.saltRounds);

        // Generate email verification token
        const verificationToken = uuidv4();

        // Create user with default role
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            roles: [config.roles.default],
            verificationToken,
            isVerified: false
        });

        // Remove password from response
        const userData = { ...user.toJSON() };
        delete userData.password;
        delete userData.verificationToken;

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        // Return success response
        return res.status(CREATED).json(
            formatResponse(
                'User registered successfully',
                { user: userData },
                'Please verify your email address to complete registration'
            )
        );
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Registration Error', error.message)
        );
    }
};

/**
 * Verify user email with token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        // Find user with the verification token
        const user = await User.findOne({
            where: { verificationToken: token }
        });

        if (!user) {
            return res.status(BAD_REQUEST).json(
                formatError('Verification Error', 'Invalid or expired verification token')
            );
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        return res.status(OK).json(
            formatResponse('Email verified successfully', null, 'You can now log in to your account')
        );
    } catch (error) {
        console.error('Email verification error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Verification Error', error.message)
        );
    }
};

/**
 * Login user and generate tokens
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({
            where: { email }
        });

        // Check if user exists
        if (!user) {
            return res.status(UNAUTHORIZED).json(
                formatError('Authentication Error', 'Invalid email or password')
            );
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(FORBIDDEN).json(
                formatError('Authentication Error', 'Email not verified', 'Please verify your email before logging in')
            );
        }

        // Compare passwords
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            // Increment failed login attempts
            user.loginAttempts += 1;

            // Lock account if max attempts reached
            if (user.loginAttempts >= config.rateLimit.loginAttempts.maxAttempts) {
                user.accountLocked = true;
                user.lockUntil = new Date(Date.now() + config.rateLimit.loginAttempts.windowMs);
            }

            await user.save();

            return res.status(UNAUTHORIZED).json(
                formatError('Authentication Error', 'Invalid email or password')
            );
        }

        // Check if account is locked
        if (user.accountLocked) {
            // Check if lock period has expired
            if (user.lockUntil && user.lockUntil > new Date()) {
                return res.status(FORBIDDEN).json(
                    formatError(
                        'Authentication Error',
                        'Account temporarily locked',
                        `Try again after ${new Date(user.lockUntil).toLocaleString()}`
                    )
                );
            }

            // Reset lock if expired
            user.accountLocked = false;
            user.lockUntil = null;
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        await user.save();

        // Generate tokens
        const tokens = await generateTokens(user);

        // Prepare user data for response (excluding sensitive fields)
        const userData = { ...user.toJSON() };
        delete userData.password;
        delete userData.verificationToken;
        delete userData.resetPasswordToken;

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(OK).json(
            formatResponse('Login successful', {
                accessToken: tokens.accessToken,
                user: userData
            })
        );
    } catch (error) {
        console.error('Login error:', error);
        return res.status(UNAUTHORIZED).json(
            formatError('Authentication Error', error.message)
        );
    }
};

/**
 * Refresh access token using refresh token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const refreshToken = async (req, res) => {
    try {
        // Get refresh token from cookie or request body
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(UNAUTHORIZED).json(
                formatError('Token Error', 'Refresh token is required')
            );
        }

        // Verify refresh token
        const decoded = await verifyToken(refreshToken, 'refresh');

        // Find user
        const user = await User.findByPk(decoded.sub);

        if (!user) {
            return res.status(UNAUTHORIZED).json(
                formatError('Token Error', 'Invalid refresh token')
            );
        }

        // Generate new tokens
        const tokens = await generateTokens(user);

        // Set new refresh token in cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(OK).json(
            formatResponse('Token refreshed successfully', {
                accessToken: tokens.accessToken
            })
        );
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(UNAUTHORIZED).json(
            formatError('Token Error', 'Invalid or expired refresh token')
        );
    }
};

/**
 * Log user out by clearing tokens
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const logout = (req, res) => {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return res.status(OK).json(
        formatResponse('Logout successful')
    );
};

/**
 * Initiate password reset process
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({
            where: { email }
        });

        // Don't reveal if user exists or not for security
        if (!user) {
            return res.status(OK).json(
                formatResponse(
                    'Password reset email sent',
                    null,
                    'If your email is registered, you will receive reset instructions'
                )
            );
        }

        // Generate reset token
        const resetToken = uuidv4();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Save token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Send password reset email
        await sendPasswordResetEmail(email, resetToken);

        return res.status(OK).json(
            formatResponse(
                'Password reset email sent',
                null,
                'If your email is registered, you will receive reset instructions'
            )
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Reset Error', error.message)
        );
    }
};

/**
 * Reset password with token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(BAD_REQUEST).json(
                formatError('Validation Error', passwordValidation.message)
            );
        }

        // Find user with reset token
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [User.sequelize.Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(BAD_REQUEST).json(
                formatError('Reset Error', 'Invalid or expired reset token')
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, config.password.saltRounds);

        // Update user password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.loginAttempts = 0;
        user.accountLocked = false;
        await user.save();

        return res.status(OK).json(
            formatResponse('Password reset successful', null, 'You can now log in with your new password')
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Reset Error', error.message)
        );
    }
};

/**
 * Get the public key for token verification
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getJwks = async (req, res) => {
    try {
        const publicKey = await getPublicKey();

        // Format the public key as a JWKS (JSON Web Key Set)
        const jwks = {
            keys: [
                {
                    kty: 'RSA',
                    use: 'sig',
                    kid: '1', // Key ID
                    alg: 'RS256',
                    n: publicKey.split('-----')[2].replace(/\s+/g, ''), // Modulus
                    e: 'AQAB' // Exponent
                }
            ]
        };

        return res.status(OK).json(jwks);
    } catch (error) {
        console.error('JWKS error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('JWKS Error', 'Could not retrieve public key')
        );
    }
};

/**
 * Get current authenticated user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password', 'verificationToken', 'resetPasswordToken', 'resetPasswordExpires'] }
        });

        if (!user) {
            return res.status(NOT_FOUND).json(
                formatError('User Error', 'User not found')
            );
        }

        return res.status(OK).json(
            formatResponse('User retrieved successfully', { user })
        );
    } catch (error) {
        console.error('Get current user error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('User Error', error.message)
        );
    }
};

/**
 * Change user password
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Find user
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(NOT_FOUND).json(
                formatError('User Error', 'User not found')
            );
        }

        // Verify current password
        const passwordIsValid = await bcrypt.compare(currentPassword, user.password);
        if (!passwordIsValid) {
            return res.status(UNAUTHORIZED).json(
                formatError('Password Error', 'Current password is incorrect')
            );
        }

        // Validate new password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(BAD_REQUEST).json(
                formatError('Validation Error', passwordValidation.message)
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, config.password.saltRounds);

        // Update password
        user.password = hashedPassword;
        await user.save();

        return res.status(OK).json(
            formatResponse('Password changed successfully')
        );
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Password Error', error.message)
        );
    }
};

module.exports = {
    register,
    verifyEmail,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    getJwks,
    getCurrentUser,
    changePassword
};