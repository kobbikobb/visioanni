import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteGoal } from '@/api/goalApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';

export const useDeleteGoal = () => {
    const queryClient = useQueryClient();

    const deleteGoalMutation = useMutation({
        mutationFn: (id: number) => deleteGoal(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['query-goals'] });
        },
        onError: (error: unknown) => {
            toast(getErrorMessage(error));
        }
    });

    return {
        deleteGoal: deleteGoalMutation.mutate,
        isPending: deleteGoalMutation.isPending
    };
};
