# backend Dockerfile
# multi-stage to compile TypeScript then run in slim image

FROM node:22-alpine AS builder
WORKDIR /app

# copy package files and tsconfig to install deps and compile
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm ci
RUN npm run build

# production image
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# copy compiled code and any other assets
COPY --from=builder /app/dist ./dist

# copy environment example (optional)
# COPY .env.example .env

EXPOSE 4000
CMD ["node", "dist/app.js"]
