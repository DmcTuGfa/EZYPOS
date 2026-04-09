FROM node:20.18.0-alpine
RUN npm install -g pnpm
WORKDIR /app

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build

# Copy static assets to the standalone folder where Next expects them
RUN mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static
RUN if [ -d public ]; then cp -r public .next/standalone/public; fi

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "cd .next/standalone && HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node server.js"]
