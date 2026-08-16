# Build the Vite application. VITE_* values are public URLs embedded in the
# browser bundle, so secrets must never be passed here.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

ARG VITE_SPRING_API_URL
ARG VITE_AI_API_URL
ENV VITE_SPRING_API_URL=$VITE_SPRING_API_URL \
    VITE_AI_API_URL=$VITE_AI_API_URL

RUN npm run build

# Caddy serves the generated static files and rewrites React Router routes to
# index.html. It binds to Railway's injected PORT at runtime.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

EXPOSE 8080
