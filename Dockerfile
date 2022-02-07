FROM node:16-alpine
WORKDIR /usr/app
RUN apk add --no-cache git python3 make gcc musl-dev g++
COPY . .
RUN npm i
CMD [ "node", "src/main.js" ]
