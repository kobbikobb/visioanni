import { api } from './api.ts';

type createTaskParams = {
    goalId: number;
    title: string;
};

export const createTask = async ({
    goalId,
    title
}: createTaskParams): Promise<void> => {
    const response = await api.goals[':goalId{[0-9]+}'].tasks.$post({
        param: { goalId: goalId.toString() },
        json: {
            title
        }
    });
    if (!response.ok) {
        throw new Error('Failed to create task.');
    }
};

export const getTasks = async (goalId: number) => {
    const response = await api.goals[':goalId{[0-9]+}'].tasks.$get({
        param: { goalId: goalId.toString() }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch tasks.');
    }
    const data = await response.json();
    return data.tasks;
};

export const deleteTask = async (
    goalId: number,
    taskId: number
): Promise<void> => {
    const response = await api.goals[':goalId{[0-9]+}'].tasks[
        ':taskId{[0-9]+}'
    ].$delete({
        param: { goalId: goalId.toString(), taskId: taskId.toString() }
    });
    if (!response.ok) {
        throw new Error('Failed to delete task.');
    }
};
