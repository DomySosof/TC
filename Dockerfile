# Use the official Node.js 18 image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists) to install dependencies
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Run as root user (for testing)
USER root

# Expose the port the app runs on
EXPOSE 3020

# Command to run the application
CMD ["npm", "start"]