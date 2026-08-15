FROM node:20-alpine

RUN npm install -g tsx

WORKDIR /app

# Copy the town-frontend build
COPY town-frontend/dist/ ./town-frontend/dist/
COPY town-frontend/package.json ./town-frontend/

# Copy the foundry adapter
COPY foundry-adapter/ ./foundry-adapter/

# Install adapter dependencies
RUN cd foundry-adapter && npm install

# Expose ports
EXPOSE 55210 55211

# Run the town server
CMD ["tsx", "foundry-adapter/town-server.ts"]