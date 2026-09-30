# Moveo — Home Assistant add-on (also runs as a plain Docker container)

# ---- 1. build the web app ------------------------------------------------
FROM node:24-alpine AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- 2. runtime ------------------------------------------------------------
FROM node:24-alpine
RUN apk add --no-cache tzdata
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/src ./src
COPY server/content ./content
COPY --from=web /app/web/dist /app/web/dist

ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=8788
EXPOSE 8788

LABEL io.hass.type="addon" \
      io.hass.name="Moveo" \
      io.hass.description="Allenamento, stretching e pause attive collegato a Calendary"

CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.js"]
