FROM node:8 as base
WORKDIR /app
COPY package*.json ./
ENV HOST 0.0.0.0
ENV PORT 80
COPY . .
RUN apt-get update
RUN apt-get -y install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
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


