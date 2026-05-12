FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Le montage compose `./backend:/app` + volume anonyme `/app/node_modules` peut garder d’anciens modules :
# un npm install au démarrage aligne node_modules sur package.json / package-lock.
CMD ["sh", "-c", "npm install && npm start"]
