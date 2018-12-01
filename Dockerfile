FROM node
RUN npm i -g http-server

COPY . /docs
WORKDIR /docs

RUN npm ci
RUN npm run docs:build

CMD http-server docs/.vuepress/dist
