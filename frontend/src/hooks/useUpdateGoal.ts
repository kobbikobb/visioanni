import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGoal } from '@/api/goalApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

export const useUpdateGoal = () => {
    const queryClient = useQueryClient();

    const updateGoalMutation = useMutation({
        mutationFn: updateGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['query-goals'] });
        },
        onError: (error: unknown) => {
            toast(getErrorMessage(error));
        }
    });

    return {
        updateGoalMutation: updateGoalMutation.mutate,
        isPending: updateGoalMutation.isPending
    };
};
