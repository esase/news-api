FROM --platform=linux/amd64 node:lts-alpine

WORKDIR /app

COPY ./src ./src
COPY ./.yarn/ ./.yarn/
COPY ./.pnp.cjs .
COPY ./package.json .
COPY ./.yarnrc.yml .
COPY ./yarn.lock .
COPY ./tsconfig.json .

RUN yarn
RUN yarn build
CMD yarn start
