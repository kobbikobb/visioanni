type createGoalParams = {
    title: string;
    date: string;
};

export const createGoal = async ({
    title,
    date
}: createGoalParams): Promise<void> => {
    const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, date, completed: false })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create goal.');
    }
};

export const getGoals = async () => {
    const response = await fetch('/api/goals');
    if (!response.ok) {
        throw new Error('Failed to fetch goals.');
    }

    const data = await response.json();

    return data.goals;
};
