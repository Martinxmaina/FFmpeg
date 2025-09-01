# Use Node.js as base image
FROM node:20

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose port (Railway uses this to know what to run)
EXPOSE 3000

# Start your app
CMD ["npm", "start"]
