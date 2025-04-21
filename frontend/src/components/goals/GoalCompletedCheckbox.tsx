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
                className="w-5 h-5 border border-gray-400 bg-white dark:bg-gray-800 dark:border-gray-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-colors"
            />
            <div className="grid gap-1.5 leading-none">
                <label
                    htmlFor={checkboxId}
                    className={`font-medium text-sm ${goal.completed ? 'text-green-500' : 'text-gray-400'}`}
                >
                    {goal.completed ? 'Completed' : 'Mark as Completed'}
                </label>
            </div>
        </div>
    );
};

export default GoalCompletedCheckbox;
