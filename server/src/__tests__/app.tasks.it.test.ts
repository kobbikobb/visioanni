import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import app from '../app';
import * as kinde from '../kinde';
import { type UserType } from '@kinde-oss/kinde-typescript-sdk';

const aGoal = () => {
    return {
        title: 'New Goal',
        date: '2021-01-01'
    };
};

const postData = (path: string, obj: object) => {
    return app.request(path, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

describe('Task API', () => {
    const userId = 'user-id-1';

    beforeEach(() => {
        const user = { id: userId } as UserType;

        spyOn(kinde.kindeClient, 'isAuthenticated').mockReturnValue(
            Promise.resolve(true)
        );
        spyOn(kinde.kindeClient, 'getUserProfile').mockReturnValue(
            Promise.resolve(user)
        );
        spyOn(kinde.kindeClient, 'getUser').mockReturnValue(
            Promise.resolve(user)
        );
    });

    it('should POST a new task', async () => {
        const newGoalResponse = await postData('/api/goals', aGoal());
        const newGoal = await newGoalResponse.json();

        const newTask = { title: 'Setup infra' };
        const newTaskResponse = await postData(
            `api/goals/${newGoal.id}/tasks`,
            newTask
        );

        expect(newTaskResponse.status).toEqual(201);
        const newTaskData = await newTaskResponse.json();
        expect(newTaskData).toMatchObject({ title: 'Setup infra' });
    });
});
