import { useGoals } from '@/hooks/useGoals';

const GoalsList: React.FC = () => {
    const { goals, loading, error } = useGoals();

    if (loading) {
        return <div className="py-4 text-center">Loading...</div>;
    }

    if (error) {
        return <div className="py-4 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="mt-4 space-y-6">
            {goals.map((goal, index) => (
                <div
                    key={index}
                    className="p-4 bg-gray-200 border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                    <h2 className="text-xl font-semibold text-gray-800">
                        {goal.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {new Date(goal.date).toLocaleDateString()}
                    </p>
                    <div
                        className={`mt-2 text-sm font-medium ${goal.completed ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {goal.completed ? 'Completed' : 'Not Completed'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GoalsList;
