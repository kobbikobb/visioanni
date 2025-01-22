import { describe, it, expect } from 'bun:test';
import app from '../app';

describe('Goals API', () => {
    it('should GET goals', async () => {
        const newGoal = {
            title: 'New Goal',
            date: '2021-01-01',
            completed: false
        };
        await app.request('/api/goals', {
            method: 'POST',
            body: JSON.stringify(newGoal),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const goalsResponse = await app.request('/api/goals');

        expect(goalsResponse.status).toBe(200);
        const goalsData = await goalsResponse.json();
        expect(goalsData.goals).toContainEqual(
            expect.objectContaining(newGoal)
        );
    });

    it('should GET goal', async () => {
        const newGoal = {
            title: 'New Goal',
            date: '2021-01-01',
            completed: false
        };
        const newGoalResponse = await app.request('/api/goals', {
            method: 'POST',
            body: JSON.stringify(newGoal),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const newGoalData = await newGoalResponse.json();

        const goalResponse = await app.request(`/api/goals/${newGoalData.id}`);

        expect(goalResponse.status).toBe(200);
        const goalData = await goalResponse.json();
        expect(goalData).toMatchObject(newGoal);
    });

    it('should POST a new goal', async () => {
        const newGoal = {
            title: 'New Goal',
            date: '2021-01-01',
            completed: false
        };

        const newGoalResponse = await app.request('/api/goals', {
            method: 'POST',
            body: JSON.stringify(newGoal),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        expect(newGoalResponse.status).toBe(201);
        const goalData = await newGoalResponse.json();
        expect(goalData).toMatchObject(newGoal);
    });
});
