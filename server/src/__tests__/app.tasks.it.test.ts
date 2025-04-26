import { describe, it, expect, beforeEach } from 'bun:test';
import type { UserType } from '@kinde-oss/kinde-typescript-sdk';
import {
    aGoal,
    deleteData,
    getData,
    postData,
    putData
} from './helpers/apiHelper';
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

    it('should POST a new task for a goal not found', async () => {
        const newTask = { title: 'Setup infra' };
        const newTaskResponse = await postData(`api/goals/9999/tasks`, newTask);

        expect(newTaskResponse.status).toBe(404);
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

    it('should GET tasks', async () => {
        // Arrange
        const newGoalResponse = await postData('/api/goals', aGoal());
        const newGoalData = await newGoalResponse.json();

        await postData(`api/goals/${newGoalData.id}/tasks`, {
            title: 'Setup infra'
        });
        await postData(`api/goals/${newGoalData.id}/tasks`, {
            title: 'Setup code'
        });
        // Act
        const existingTasksResponse = await getData(
            `/api/goals/${newGoalData.id}/tasks`
        );

        // Assert
        expect(existingTasksResponse.status).toBe(200);
        const existingTasksData = await existingTasksResponse.json();
        expect(existingTasksData.tasks).toHaveLength(2);
        expect(existingTasksData.tasks[0]).toMatchObject({
            title: 'Setup infra'
        });
        expect(existingTasksData.tasks[1]).toMatchObject({
            title: 'Setup code'
        });
    });

    it('should PUT a task', async () => {
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
        const updateTaskResponse = await putData(
            `/api/goals/${newGoalData.id}/tasks/${newTaskData.id}`,
            { title: 'New infra' }
        );

        // Assert
        expect(updateTaskResponse.status).toBe(200);
        const updateTaskResponseData = await updateTaskResponse.json();
        expect(updateTaskResponseData).toMatchObject({ title: 'New infra' });
    });

    it('should DELETE a task', async () => {
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
        const goalResponse = await getData(
            `/api/goals/${newGoalData.id}/tasks/${newTaskData.id}`
        );
        expect(goalResponse.status).toBe(404);
    });
});
