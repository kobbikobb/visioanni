import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Goal, Task } from '../../sharedTypes';
import { findGoal } from '../../repositories/goalRepository';

type ValidationError =
    | { message: string; status: ContentfulStatusCode }
    | undefined;

export const validateGoal = async (
    goal: Goal | undefined,
    userId: string
): Promise<ValidationError> => {
    if (!goal) {
        return { message: 'Not found.', status: 404 };
    }
    if (goal.userId !== userId) {
        return { message: 'Not permitted.', status: 403 };
    }
    return undefined;
};

export const validateGoalId = async (
    goalId: number,
    userId: string
): Promise<ValidationError> => {
    const existingGoal = await findGoal(goalId);
    return validateGoal(existingGoal, userId);
};

export const validateTask = async (
    task: Task | undefined,
    goalId: number,
    userId: string
): Promise<ValidationError> => {
    if (!task) {
        return { message: 'Not found.', status: 404 };
    }
    if (task.goalId !== goalId) {
        return { message: 'Not permitted.', status: 403 };
    }
    return validateGoalId(goalId, userId);
};
