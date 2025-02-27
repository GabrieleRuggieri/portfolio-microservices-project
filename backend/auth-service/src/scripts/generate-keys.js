/**
 * Generate RSA Key Pair Script
 * Used to generate public/private key pair for JWT signing
 */

const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

// Default output directory
const keysDir = path.join(__dirname, '..', 'keys');

// Generate keys
function generateKeyPair() {
    // Create directory if it doesn't exist
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    // Generate RSA key pair
    console.log('Generating RSA key pair...');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // Save private key
    const privateKeyPath = path.join(keysDir, 'private.key');
    fs.writeFileSync(privateKeyPath, privateKey);
    console.log(`Private key saved to: ${privateKeyPath}`);

    // Save public key
    const publicKeyPath = path.join(keysDir, 'public.key');
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log(`Public key saved to: ${publicKeyPath}`);

    // Set permissions for private key (Linux/Mac only)
    try {
        if (process.platform !== 'win32') {
            fs.chmodSync(privateKeyPath, 0o600);
            console.log('Set read-only permissions for private key');
        }
    } catch (error) {
        console.warn('Could not set file permissions:', error.message);
    }

    console.log('Key generation complete!');
}

// Execute the function
generateKeyPair();