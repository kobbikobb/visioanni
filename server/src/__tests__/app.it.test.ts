import { describe, it, expect } from 'bun:test';
import app from '../app';

const aGoal = () => {
    return {
        title: 'New Goal',
        date: '2021-01-01',
        completed: false
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

const deleteData = (path: string) => {
    console.log('path', path);
    return app.request(path, {
        method: 'DELETE'
    });
};

describe('Goals API', () => {
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
