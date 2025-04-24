import { describe, it, expect, beforeEach } from 'bun:test';
import type { UserType } from '@kinde-oss/kinde-typescript-sdk';
import { aGoal, deleteData, getData, postData } from './helpers/apiHelper';
import { asAuthenticatedUser } from './helpers/kindeHelper';

describe('Task API', () => {
    const userId = 'user-id-1';

    beforeEach(() => {
        const user = { id: userId } as UserType;
        asAuthenticatedUser(user);
    });

    it('should POST a new task', async () => {
        const newGoalResponse = await postData('/api/goals', aGoal());
        const newGoal = await newGoalResponse.json();

        const newTask = { title: 'Setup infra' };
        const newTaskResponse = await postData(
            `api/goals/${newGoal.id}/tasks`,
            newTask
        );

        expect(newTaskResponse.status).toBe(201);
        const newTaskData = await newTaskResponse.json();
        expect(newTaskData).toMatchObject({ title: 'Setup infra' });
    });

    it('should GET a task', async () => {
        // Arrange
        const newGoalResponse = await postData('/api/goals', aGoal());
        const newGoalData = await newGoalResponse.json();

        const newTask = { title: 'Setup infra' };
        const newTaskResponse = await postData(
            `api/goals/${newGoalData.id}/tasks`,
            newTask
        );
        const newTaskData = await newTaskResponse.json();

        // Act
        const existingTaskResponse = await getData(
            `/api/goals/${newGoalData.id}/tasks/${newTaskData.id}`
        );

        // Assert
        expect(existingTaskResponse.status).toBe(200);
        const existingTaskData = await existingTaskResponse.json();
        expect(existingTaskData).toMatchObject({ title: 'Setup infra' });
    });

    it('should Delete a task', async () => {
        // Arrange
        const newGoalResponse = await postData('/api/goals', aGoal());
        const newGoalData = await newGoalResponse.json();

        const newTask = { title: 'Setup infra' };
        const newTaskResponse = await postData(
            `api/goals/${newGoalData.id}/tasks`,
            newTask
        );
        const newTaskData = await newTaskResponse.json();

        // Act
        const deleteTaskResponse = await deleteData(
            `/api/goals/${newGoalData.id}/tasks/${newTaskData.id}`
        );

        // Assert
        expect(deleteTaskResponse.status).toBe(204);
        // const goalResponse = await getData(
        //     `/api/goals/${newGoalData.id}/tasks/${newTaskData.id}`
        // );
        // expect(goalResponse.status).toBe(404);
    });
});
