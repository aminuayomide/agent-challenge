FROM node:23-slim

WORKDIR /app

RUN npm install -g bun@1.3.11

COPY package.json ./
COPY bun.lock* ./

RUN bun install

COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV SERVER_PORT=3000

CMD ["./node_modules/.bin/elizaos", "start", "--character", "./characters/agent.character.json"]