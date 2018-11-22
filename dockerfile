FROM node:8-alpine as base
WORKDIR /app
COPY package*.json ./
ENV HOST 0.0.0.0
ENV PORT 80
COPY . .

# -------- INSTALL DEPENDENCIES ----------
FROM base as dependencies
RUN npm install --only=production
RUN cp -R  node_modules prod_node_modules
RUN npm install


# -------- DEVELOPMENT ----------
FROM dependencies as build-dev
ENV NODE_ENV=development
CMD [ "npm", "start" ]

# --------- PRODUCTION -----------

FROM base as build-prod
ENV NODE_ENV=production
COPY --from=dependencies /app/prod_node_modules ./node_modules
CMD [ "npm", "start" ]


