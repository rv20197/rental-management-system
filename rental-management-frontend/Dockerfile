# frontend Dockerfile for production build served by nginx

FROM node:22-alpine AS builder
WORKDIR /app

# allow build-time override of API URL so Vite can inline it
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# copy package.json, tsconfig, Vite config, and public assets
COPY package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm ci
RUN npm run build

# serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# use our custom configuration (rewrite for SPA & proxy API)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
