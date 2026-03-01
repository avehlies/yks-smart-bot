# -----------------------------------------------------------------------------
# Stage 1: Build native modules (canvas, etc.) and install dependencies
# -----------------------------------------------------------------------------
FROM node:18-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /var/cache/apt/archives/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source so native modules can link; we'll copy full app in final stage
COPY . .

# -----------------------------------------------------------------------------
# Stage 2: Production image – runtime deps only, no build tools
# -----------------------------------------------------------------------------
FROM node:18-slim

# Runtime libs only (no -dev); ffmpeg for @discordjs/voice
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && rm -rf /var/cache/apt/archives/*

WORKDIR /app

# Copy package files, pre-built node_modules from builder, then app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npm", "start"]
