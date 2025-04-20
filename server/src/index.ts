import app from './app';

const envVars = [
    'KINDE_ISSUER_URL',
    'KINDE_CLIENT_ID',
    'KINDE_CLIENT_SECRET',
    'KINDE_SITE_URL',
    'KINDE_LOGOUT_REDIRECT_URI',
    'KINDE_DOMAIN',
    'KINDE_REDIRECT_URI',
    'DATABASE_URL'
];

envVars.forEach((key) => {
    console.log(`${key}=${process.env[key] || '(not set)'}`);
});

Bun.serve({
    fetch: app.fetch
});

console.log('Server Running');
