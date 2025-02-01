import { useState, ChangeEvent } from 'react';
import { createGoal } from '../api/goalApi';

const useCreateGoal = () => {
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);
    const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formattedDate = new Date(e.target.value).toISOString().split('T')[0];
        setDate(formattedDate);
    };

    const handleCreateGoal = async () => {
        if (!title || !date) {
            setStatus('Title and Date are required.');
            return;
        }

        try {
            await createGoal({ title, date });
            setStatus('Goal created successfully!');
            setTitle('');
            setDate('');
        } catch (error: unknown) {
            setStatus(error instanceof Error ? `Network error: ${error.message}` : 'Unknown error.');
        }
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

