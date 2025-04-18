import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGoal } from '@/api/goalApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

export const useCreateGoal = ({ onSuccessFn }: { onSuccessFn: () => void }) => {
    const queryClient = useQueryClient();

    const createGoalMutation = useMutation({
        mutationFn: createGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['query-goals'] });
            onSuccessFn();
        },
        onError: (error: unknown) => {
            toast(getErrorMessage(error));
        }
    });

    return {
        createGoal: createGoalMutation.mutate,
        status: createGoalMutation.status,
        error: createGoalMutation.error,
        isPending: createGoalMutation.isPending
    };
};
