import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/api/taskApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

export const useCreateGoalTask = ({
    goalId,
    onSuccessFn
}: {
    goalId: number;
    onSuccessFn: () => void;
}) => {
    const queryClient = useQueryClient();

    const createGoalTask = ({ title }: { title: string }) =>
        createTask({ goalId, title });

    const createTaskMutation = useMutation({
        mutationFn: createGoalTask,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [`query-task-goal-${goalId}`]
            });
            onSuccessFn();
        },
        onError: (error: unknown) => {
            toast(getErrorMessage(error));
        }
    });

    return {
        createTask: createTaskMutation.mutate,
        status: createTaskMutation.status,
        error: createTaskMutation.error,
        isPending: createTaskMutation.isPending
    };
};
