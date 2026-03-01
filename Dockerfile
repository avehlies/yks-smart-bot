# Use Node.js 18 LTS as base image
FROM node:18-slim

# Install system dependencies required for native modules and voice
# - build-essential: C/C++ compiler and build tools (needed for canvas, @discordjs/opus, etc.)
# - libcairo2-dev, libpango1.0-dev, etc.: required for canvas
# - python3: Required for building native modules
# - ffmpeg: Required by @discordjs/voice for playing MP3/arbitrary streams (prism-media)
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for ts-node)
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript (if needed) or just copy source
# Since the project uses ts-node, we'll run it directly
# For production, you might want to compile TypeScript first

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
