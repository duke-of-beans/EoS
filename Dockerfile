# Start from Node.js (small version)
FROM node:22-alpine

# Go into /app folder in the container
WORKDIR /app

# Copy package.json (tells Docker what dependencies to install)
COPY package*.json ./

# Install only production dependencies (no dev junk)
RUN npm install --only=production

# Copy the rest of your files (the code!)
COPY . .

# Tell Docker that API server uses port 3000
EXPOSE 3000

# When container runs: use entrypoint.js to figure out what to do
ENTRYPOINT ["node", "/app/entrypoint.js"]
