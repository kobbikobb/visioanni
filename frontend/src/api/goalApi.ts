import { api } from './api.ts';

type createGoalParams = {
    title: string;
    date: string;
};

export const createGoal = async ({
    title,
    date
}: createGoalParams): Promise<void> => {
    const response = await api.goals.$post({
        json: {
            title,
            date
        }
    });
    if (!response.ok) {
        throw new Error('Failed to create goal.');
    }
};

export const getGoals = async () => {
    const response = await api.goals.$get();
    if (!response.ok) {
        throw new Error('Failed to fetch goals.');
    }
    const data = await response.json();
    return data.goals;
};

export const deleteGoal = async (id: number) => {
    const response = await api.goals[':id{[0-9]+}'].$delete({
        param: { id: id.toString() }
    });
    if (!response.ok) {
        throw new Error('Failed to delete goal.');
    }
};
