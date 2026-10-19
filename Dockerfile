FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/ ./server/
COPY js/ ./js/
COPY css/ ./css/
COPY index.html login.html 404.html ./
ENV HOST=0.0.0.0
USER node
CMD ["node", "server/index.mjs"]
