import { useState, useEffect } from 'react';
import { getGoals } from '../api/goalApi';

interface Goal {
    title: string;
    date: string;
    completed: boolean;
}

const useGetGoals = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const goalsResult = await getGoals();
                setGoals(goalsResult);
            } catch (error: unknown) {
                setError(error instanceof Error ? error.message : 'Unknown error.');
            } finally {
                setLoading(false);
            }
        };

        fetchGoals();
    }, []);

    return { goals, loading, error };
};

export default useGetGoals;