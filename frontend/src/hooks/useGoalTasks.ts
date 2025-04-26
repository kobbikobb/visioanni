import { useQuery } from '@tanstack/react-query';
import { getTasks } from '@/api/taskApi';

export const useGoalTasks = ({ goalId }: { goalId: number }) => {
    const getGoalTasks = () => {
        return getTasks(goalId);
    };
    const {
        data: tasks = [],
        isPending: loading = true,
        error
    } = useQuery({
        queryKey: [`query-task-goal-${goalId}`],
        queryFn: getGoalTasks
    });

    return { tasks, loading, error: error?.message };
};
