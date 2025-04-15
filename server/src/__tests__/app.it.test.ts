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

const getData = (path: string) => {
    return app.request(path);
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

const putData = (path: string, obj: object) => {
    return app.request(path, {
        method: 'PUT',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

const deleteData = (path: string) => {
    return app.request(path, {
        method: 'DELETE'
    });
};

describe('Goals API', () => {
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

    it('should GET goals', async () => {
        const newGoal = aGoal();
        await postData('/api/goals', newGoal);

        const goalsResponse = await getData('/api/goals');

        expect(goalsResponse.status).toBe(200);
        const goalsData = await goalsResponse.json();
        expect(goalsData.goals).toContainEqual(
            expect.objectContaining(newGoal)
        );
    });

    it('should GET goal', async () => {
        const newGoal = aGoal();
        const newGoalResponse = await postData('/api/goals', newGoal);
        const newGoalData = await newGoalResponse.json();

        const goalResponse = await getData(`/api/goals/${newGoalData.id}`);

        expect(goalResponse.status).toBe(200);
        const goalData = await goalResponse.json();
        expect(goalData).toMatchObject(newGoal);
    });

    it('should POST a new goal', async () => {
        const newGoal = aGoal();
        const newGoalResponse = await postData('/api/goals', newGoal);

        expect(newGoalResponse.status).toBe(201);
        const goalData = await newGoalResponse.json();
        expect(goalData).toMatchObject(newGoal);
    });

    it('should PUT a goal to update it', async () => {
        const newGoal = aGoal();
        const newGoalResponse = await postData('/api/goals', newGoal);
        const id = (await newGoalResponse.json()).id;

        const updatedGoal = {
            title: 'Updated Goal',
            date: '2022-02-02',
            completed: true
        };
        const updatedGoalResponse = await putData(
            `api/goals/${id}`,
            updatedGoal
        );

        expect(updatedGoalResponse.status).toBe(200);
        const goalData = await updatedGoalResponse.json();
        expect(goalData).toMatchObject(updatedGoal);
    });

    it('should DELETE goal', async () => {
        const newGoal = aGoal();
        const newGoalResponse = await postData('/api/goals', newGoal);
        const newGoalData = await newGoalResponse.json();

        const deleteGoalResponse = await deleteData(
            `/api/goals/${newGoalData.id}`
        );

        expect(deleteGoalResponse.status).toBe(204);
        const goalResponse = await getData(`/api/goals/${newGoalData.id}`);
        expect(goalResponse.status).toBe(404);
    });
});
