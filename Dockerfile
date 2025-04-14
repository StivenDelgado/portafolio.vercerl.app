    FROM node:20-alpine

    WORKDIR /app

    # Copy package files
    COPY package*.json ./

    # Install dependencies
    RUN npm ci

    # Copy project files
    COPY . .

    # Build the project
    RUN npm run build

    # Expose port 80
    EXPOSE 80

    COPY startup.sh /app/startup.sh
    RUN chmod +x /app/startup.sh
    CMD ["sh", "/app/startup.sh"]
    