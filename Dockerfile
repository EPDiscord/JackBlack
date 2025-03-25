FROM node:lts-alpine
WORKDIR /app
COPY package.json .
COPY src src
COPY config config

RUN yarn install --production
CMD ["node", "src/index.js"]
EXPOSE 3000
