/**
 * IP Utility
 * Functions for IP address geolocation lookup
 */

const axios = require('axios');

/**
 * Get geolocation information from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {Promise<Object>} - Geolocation information
 */
const extractIPInfo = async (ipAddress) => {
    // Default empty response
    const defaultResponse = {
        country: null,
        region: null,
        city: null,
        timezone: null
    };

    try {
        // Skip for localhost, private IPs, etc.
        if (!ipAddress ||
            ipAddress === '127.0.0.1' ||
            ipAddress === 'localhost' ||
            ipAddress.startsWith('192.168.') ||
            ipAddress.startsWith('10.') ||
            ipAddress.startsWith('172.16.')) {
            return defaultResponse;
        }

        // Check if IP geolocation service is configured
        if (!process.env.IP_GEOLOCATION_API_KEY) {
            console.log('IP geolocation API key not configured, skipping lookup');
            return defaultResponse;
        }

        // Clean IP address (if it comes with port)
        const cleanIP = ipAddress.split(':')[0];

        // Make API call to IP geolocation service
        // This is a placeholder - replace with your preferred IP geolocation service
        // Examples: ip-api.com, ipinfo.io, ipstack.com, etc.
        const response = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.IP_GEOLOCATION_API_KEY}&ip=${cleanIP}`);

        if (response.data) {
            return {
                country: response.data.country_name || null,
                region: response.data.state_prov || null,
                city: response.data.city || null,
                timezone: response.data.time_zone?.name || null
            };
        }

        return defaultResponse;
    } catch (error) {
        console.error('Error getting IP geolocation:', error.message);
        return defaultResponse;
    }
};

module.exports = {
    extractIPInfo
};