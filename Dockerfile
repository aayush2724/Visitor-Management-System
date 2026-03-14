FROM node:18-alpine

WORKDIR /usr/src/app

# ✅ Install build tools required for sqlite3 native binding
RUN apk add --no-cache sqlite python3 make g++

# ✅ Copy ONLY package files first and install deps cleanly inside Docker
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# ✅ Explicit install of exceljs if needed
RUN npm install exceljs@4.4.0 --save-exact

# ✅ Copy rest of your app (but NOT local node_modules)
COPY . .

# ✅ Expose port
EXPOSE 3000

# ✅ Run the server
CMD ["node", "server.js"]
