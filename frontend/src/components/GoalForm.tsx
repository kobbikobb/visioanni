import React from 'react';
import useCreateGoal from './useCreateGoal';

const GoalForm: React.FC = () => {
    const { title, date, status, handleTitleChange, handleDateChange, handleCreateGoal } = useCreateGoal();

    return (
        <div className="max-w-md mx-auto mt-12 p-6 border border-gray-300 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Create New Goal</h2>
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={handleTitleChange}
                className="w-full p-3 mb-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="w-full p-3 mb-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
                onClick={handleCreateGoal}
                className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Create Goal
            </button>
            {status && <p className="mt-4 text-center text-gray-600">{status}</p>}
        </div>
    );
};

export default GoalForm;

