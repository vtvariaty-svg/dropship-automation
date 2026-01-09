FROM node:20-alpine

WORKDIR /app

# Copia SOMENTE manifests primeiro para cache
COPY package.json package-lock.json* ./

RUN npm i --silent

# Copia o resto do código do apps/api
COPY . .

RUN npm run build

CMD ["node", "dist/index.js"]

