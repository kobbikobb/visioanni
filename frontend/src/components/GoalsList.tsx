import { useGoals } from '@/hooks/useGoals';
import GoalCard from './GoalCard';

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
            {goals.map((goal) => (
                <GoalCard goal={goal} />
            ))}
        </div>
    );
};

export default GoalsList;
