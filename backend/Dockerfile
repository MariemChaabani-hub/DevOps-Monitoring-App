FROM node:20-slim
RUN apt-get update && apt-get install -y docker.io
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]