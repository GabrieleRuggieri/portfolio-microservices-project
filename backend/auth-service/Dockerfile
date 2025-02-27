# Use Node.js LTS version as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Create app directory and set permissions
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

# Create directory for JWT keys
RUN mkdir -p /usr/src/app/keys && chown -R node:node /usr/src/app/keys

# Copy package.json and package-lock.json
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY --chown=node:node src ./src
COPY --chown=node:node ../shared ../shared

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "src/index.js"]