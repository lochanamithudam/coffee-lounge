# Use official lightweight Node.js 20 image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source files
COPY . .

# Expose the default port (5000)
EXPOSE 5000

# Default environment variables
ENV PORT=5000

# Volume for data persistence (orders.json, reservations.json, subscribers.json)
VOLUME ["/app/data"]

# Command to start the application
CMD ["npm", "start"]
