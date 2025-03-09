import GoalListHeader from './GoalListHeader';
import GoalList from './GoalList';

export default function GoalPage() {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <GoalListHeader />
            <GoalList />
        </div>
    );
}
