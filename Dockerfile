FROM node:23-slim

WORKDIR /app

RUN npm install -g bun@1.3.11 @elizaos/cli

COPY package.json ./
COPY bun.lock* ./

RUN bun install --production

COPY . .

RUN bun run build 2>/dev/null || true

EXPOSE 3000

ENV NODE_ENV=production
ENV SERVER_PORT=3000

CMD ["elizaos", "start", "--character", "./characters/agent.character.json"]