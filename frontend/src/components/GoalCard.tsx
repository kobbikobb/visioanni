import DeleteGoalButton from './DeleteGoalButton';
import GoalCompletedCheckbox from './GoalCompletedCheckbox';
import { Goal } from '@server/sharedTypes';

const GoalCard = ({ goal }: { goal: Goal }) => (
    <div
        key={goal.id}
        className="relative p-4 bg-gray-200 border border-border rounded-xl transition-all duration-300"
    >
        <div className="absolute top-4 right-4">
            <DeleteGoalButton id={goal.id} />
        </div>

        <h2 className="text-xl font-semibold text-gray-800">{goal.title}</h2>

        <p className="text-sm text-muted-foreground">
            {new Date(goal.date).toLocaleDateString()}
        </p>

        <div className="mt-2">
            <GoalCompletedCheckbox goal={goal} />
        </div>
    </div>
);

export default GoalCard;
