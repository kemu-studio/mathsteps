FROM node:12.16.1-alpine as builder
WORKDIR /opt/mathsteps

COPY . /opt/mathsteps/
RUN  npm install
RUN  npm run test
