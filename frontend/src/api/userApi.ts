import { api } from './api.ts';
import { type UserType } from '@kinde-oss/kinde-typescript-sdk';

export const getCurrentUser = async (): Promise<UserType> => {
    const response = await api.me.$get();

    if (!response.ok) {
        throw new Error('Failed to get user.');
    }

    return (await response.json()).user;
};
