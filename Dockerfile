FROM node:20.18.0-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
