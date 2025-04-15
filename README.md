# visioanni

Create a Vision for your Annual Goals!

## Setup

- Create a Kinde account and create a new app
- Create an env file in /.env with the relevant kinde configuration
- Create a Neon account and create a new database
- Update /.env with DATABASE_URL

## Sample server/.env

KINDE_ISSUER_URL=https://codemadesimple.kinde.com
KINDE_CLIENT_ID=XXXXXXXXXXXXXX
KINDE_CLIENT_SECRET=YYYYYYYYYYYYYY
KINDE_SITE_URL=http://localhost:5173
KINDE_LOGOUT_REDIRECT_URI=http://localhost:5173/api
KINDE_DOMAIN=https://codemadesimple.kinde.com
KINDE_REDIRECT_URI=http://localhost:5173/api/callback
DATABASE_URL=postgresql://ZZZZZZZZZZZZZZZZ

## Run the app with local Db

- bun dev
- cd frontend && bun dev

## Run the app with prod Db

- bun install && bun prod:build & bun prod
- cd frontend && bun dev

## Run in Docker

- docker build -t visioanni .
- docker run --env-file .env.prod -p 3000:3000 visioanni

## TODO

- TODO: Clean up db for interfaces
- TODO: Error handling in the frontend
