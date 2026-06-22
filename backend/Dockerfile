FROM node:20-slim
RUN apt-get update && apt-get install -y docker.io
RUN npm install -g pm2
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["pm2-runtime", "server.js"]