FROM node:20.18.0-alpine
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["sh", "-c", "pnpm start"]
