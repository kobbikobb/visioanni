import { type UserType } from '@kinde-oss/kinde-typescript-sdk';
import { createMiddleware } from 'hono/factory';
import { sessionManager } from './kinde';
import { kindeClient } from './kinde';

type Env = {
    Variables: {
        user: UserType;
    };
};

export const getUser = createMiddleware<Env>(async (c, next) => {
    try {
        const manager = sessionManager(c);
        const authenticated = await kindeClient.isAuthenticated(manager);
        console.log('YAY');
        if (!authenticated) {
            return c.json({ message: 'not authenticated' }, 401);
        }
        const user = await kindeClient.getUserProfile(manager);
        c.set('user', user);
    } catch (e) {
        console.error(e);
        return c.json({ message: 'not authenticated' }, 401);
    }
    await next();
});
