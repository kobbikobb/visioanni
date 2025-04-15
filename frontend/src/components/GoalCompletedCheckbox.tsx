import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateGoal } from '@/hooks/useUpdateGoal';
import { Goal } from '@server/sharedTypes';

const GoalCompletedCheckbox = ({ goal }: { goal: Goal }) => {
    const { updateGoalMutation, isPending } = useUpdateGoal();
    const checkboxId = `${goal.id}isCompleted`;

    const toggleCompleted = (isCompleted: boolean) => {
        updateGoalMutation({
            id: goal.id,
            title: goal.title,
            date: goal.date,
            completed: isCompleted
        });
    };

    return (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={checkboxId}
                disabled={isPending}
                onCheckedChange={toggleCompleted}
                checked={goal.completed}
            />
            <div className="grid gap-1.5 leading-none">
                <label
                    htmlFor={checkboxId}
                    className={`font-medium text-sm ${goal.completed ? 'text-green-500' : 'text-red-500'}`}
                >
                    Completed
                </label>
            </div>
        </div>
    );
};

export default GoalCompletedCheckbox;
