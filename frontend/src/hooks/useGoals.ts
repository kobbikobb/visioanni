import { useQuery } from '@tanstack/react-query';
import { getGoals } from '@/api/goalApi';

export const useGoals = () => {
    const {
        data: goals = [],
        isPending: loading = true,
        error
    } = useQuery({
        queryKey: ['query-goals'],
        queryFn: getGoals
    });

    return { goals, loading, error: error?.message };
};
