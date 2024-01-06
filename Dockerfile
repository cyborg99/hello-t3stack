ARG BASE=node:20.1.0-bullseye

FROM ${BASE} AS dependencies

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn
RUN npx prisma generate
RUN rm -rf prisma
