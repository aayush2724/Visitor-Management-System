FROM node:18-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache sqlite python3 make g++

COPY package*.json ./
RUN npm install --production --legacy-peer-deps

RUN npm install exceljs@4.4.0 --save-exact

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
