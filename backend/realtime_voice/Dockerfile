FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

EXPOSE 5050

CMD ["node", "server.js"]
