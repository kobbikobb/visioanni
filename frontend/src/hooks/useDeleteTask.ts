import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTask } from '@/api/taskApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

export const useDeleteGoalTask = () => {
    const queryClient = useQueryClient();

    const deleteTaskMutation = useMutation({
        mutationFn: async ({
            goalId,
            taskId
        }: {
            goalId: number;
            taskId: number;
        }) => {
            await deleteTask(goalId, taskId);
            return { goalId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: [`query-task-goal-${data.goalId}`]
            });
        },
        onError: (error: unknown) => {
            toast(getErrorMessage(error));
        }
    });

    return {
        deleteTask: deleteTaskMutation.mutate,
        isPending: deleteTaskMutation.isPending
    };
};
