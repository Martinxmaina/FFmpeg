# Base image
FROM node:20

# Install ffmpeg (pinned to 8.x line)
RUN apt-get update && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# App setup
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Expose app port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
