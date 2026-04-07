FROM node:20.19.0-alpine

# Use /app as the base directory
WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./backend/

# Install dependencies in backend
RUN cd backend && npm install

# Copy backend and frontend code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose the application port
EXPOSE 3000

# Run from the backend directory
WORKDIR /app/backend
CMD ["npm", "start"]
