import React from 'react';
import useCreateGoal from './useCreateGoal';
import { Button } from '@/components/ui/button';

const GoalForm: React.FC = () => {
    const {
        title,
        date,
        status,
        handleTitleChange,
        handleDateChange,
        handleCreateGoal
    } = useCreateGoal();

    return (
        <div className="max-w-md mx-auto mt-12 p-6 border border-gray-300 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">
                Create New Goal
            </h2>
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={handleTitleChange}
                className="w-full p-3 mb-3 rounded-md border"
            />
            <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="w-full p-3 mb-3 rounded-md border"
            />
            <Button
                onClick={handleCreateGoal}
                className="w-full p-3 mb-3 bg-primary"
            >
                Create Goal
            </Button>
            {status && (
                <p className="mt-4 text-center text-gray-600">{status}</p>
            )}
        </div>
    );
};

export default GoalForm;
