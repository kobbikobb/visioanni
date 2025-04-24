import type { UserType } from '@kinde-oss/kinde-typescript-sdk';
import { spyOn } from 'bun:test';
import * as kinde from '../../kinde';

export const asAuthenticatedUser = (user: UserType) => {
    spyOn(kinde.kindeClient, 'isAuthenticated').mockReturnValue(
        Promise.resolve(true)
    );
    spyOn(kinde.kindeClient, 'getUserProfile').mockReturnValue(
        Promise.resolve(user)
    );
    spyOn(kinde.kindeClient, 'getUser').mockReturnValue(Promise.resolve(user));
};
