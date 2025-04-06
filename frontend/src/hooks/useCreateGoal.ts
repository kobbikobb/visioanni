import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGoal } from '@/api/goalApi';

export const useCreateGoal = ({ onSuccessFn }: { onSuccessFn: () => void }) => {
    const queryClient = useQueryClient();

    const createGoalMutation = useMutation({
        mutationFn: createGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['query-goals'] });
            onSuccessFn();
        },
        onError: (error: unknown) => {
            throw error;
        }
    });

    return {
        createGoal: createGoalMutation.mutate,
        status: createGoalMutation.status,
        error: createGoalMutation.error,
        isPending: createGoalMutation.isPending
    };
};
