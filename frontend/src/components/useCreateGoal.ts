import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, ChangeEvent } from 'react';
import { createGoal } from '../api/goalApi';

const useCreateGoal = () => {
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const queryClient = useQueryClient(); // Get the QueryClient instance

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) =>
        setTitle(e.target.value);
    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formattedDate = new Date(e.target.value)
            .toISOString()
            .split('T')[0];
        setDate(formattedDate);
    };

    const createGoalMutation = useMutation({
        mutationFn: createGoal,
        onSuccess: () => {
            setTitle('');
            setDate('');
            setStatus('Goal created successfully!');
            queryClient.invalidateQueries({ queryKey: ['query-goals'] });
        },
        onError: (error) => {
            setStatus(
                error instanceof Error
                    ? `Network error: ${error.message}`
                    : 'Unknown error.'
            );
        }
    });

    const handleCreateGoal = async () => {
        if (!title || !date) {
            setStatus('Title and Date are required.');
            return;
        }
        createGoalMutation.mutate({ title, date });
    };

    return {
        title,
        date,
        status,
        handleTitleChange,
        handleDateChange,
        handleCreateGoal
    };
};

export default useCreateGoal;
