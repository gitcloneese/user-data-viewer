# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install the node modules
RUN npm install

# Copy the rest of the application's code
COPY . .

# Set default environment variables with placeholders
#ENV SSH_USERNAME=root \
#    SSH_PORT=22 \
#    SSH_TUNNEL_FORWARD_PORT=47107 \
#    SSH_TUNNEL_REMOTE_ADDR=127.0.0.1 \
#    SSH_TUNNEL_LOCAL_ADDR=127.0.0.1 \
#    SSH_PRIVATE_KEY_FILENAME=id_rsa \
ENV APPLICATION_PORT=80 \
    MONGO_CONNECTION_URI=mongodb://mongodb:27107/xy3 \
    MONGO_DATABASE=xy3 \
    MONGO_COLLECTION=userdata \
    MONGO_FIELDNAME=readableData

# Expose the port your app runs on
EXPOSE ${APPLICATION_PORT}

# Define the command to run your app using CMD which defines your runtime
CMD ["npm", "start"]