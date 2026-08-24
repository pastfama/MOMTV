FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx tsc
EXPOSE 80
CMD ["node", "dist/main.js"]
