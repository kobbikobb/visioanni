# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.2.3
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

### server

# Install node modules
COPY server/bun.lockb server/package.json ./
RUN cd server && bun install

# Copy application code
COPY . .

# Build server
RUN bun --bun run build

# Remove development dependencies
RUN rm -rf node_modules && \
    bun install --ci

### frontend

RUN cd ..

# Install node modules
COPY frontend/bun.lock frontend/package.json ./
RUN cd frontend && bun install

# Copy application code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN bun --bun run build

# Remove all files except dist
RUN find . -maxdepth 1 -mindepth 1 -not -name dist -exec rm -rf {} \;

### Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "run", "start" ]
