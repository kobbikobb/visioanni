# visioanni

Create a Vision for your Annual Goals!

## Setup
- Create a Kinde account and create a new app
- Create an env file in server/.env with the relevant kinde configuration
- Create a Neon account and create a new database
- Update server/.env with DATABASE_URL

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
- cd server && bun dev
- cd frontend && bun dev

## Run the app with prod Db
- cd server && bun install && bun prod:build & bun prod 
- cd frontend && bun dev

## TODO
- Clean up db for interfaces
- Error handling in the frontend
- More tests, error cases
- Enalbe Fly.io deployment
