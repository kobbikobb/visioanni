import { useGoals } from '@/hooks/useGoals';

const GoalsList: React.FC = () => {
    const { goals, loading, error } = useGoals();

    if (loading) {
        return <div className="text-center py-4">Loading...</div>;
    }

    if (error) {
        return <div className="text-center py-4 text-red-500">{error}</div>;
    }

    return (
        <div>
            <div className="space-y-6">
                {goals.map((goal, index) => (
                    <div
                        key={index}
                        className="p-4 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300"
                    >
                        <h2 className="text-xl font-semibold text-gray-900">
                            {goal.title}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {new Date(goal.date).toLocaleDateString()}
                        </p>
                        <div
                            className={`mt-2 text-sm font-medium ${
                                goal.completed
                                    ? 'text-green-500'
                                    : 'text-red-500'
                            }`}
                        >
                            {goal.completed ? 'Completed' : 'Not Completed'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoalsList;
