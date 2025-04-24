import { describe, it, expect, beforeEach } from 'bun:test';
import { type UserType } from '@kinde-oss/kinde-typescript-sdk';
import {
    aGoal,
    deleteData,
    getData,
    postData,
    putData
} from './helpers/apiHelper';
import { asAuthenticatedUser } from './helpers/kindeHelper';

describe('Goals API', () => {
    const userId = 'user-id-1';

    beforeEach(() => {
        const user = { id: userId } as UserType;
        asAuthenticatedUser(user);
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
