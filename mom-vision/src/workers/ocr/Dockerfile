FROM node:22-slim

# Install FFmpeg and curl
RUN apt-get update && apt-get install -y ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN npm install

# Build TypeScript
RUN npx tsc

EXPOSE 80

CMD ["node", "dist/workers/ocr/index.js"]
