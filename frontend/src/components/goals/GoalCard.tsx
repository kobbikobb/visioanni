import React from 'react';
import DeleteGoalButton from './DeleteGoalButton';
import GoalCompletedCheckbox from './GoalCompletedCheckbox';
import { Goal } from '@server/sharedTypes';
import Card from '../content/Card';
import TaskList from './GoalTaskList';

const GoalCard = ({ goal }: { goal: Goal }) => (
    <Card className="relative">
        <div className="absolute transition-colorstop-4 right-4">
            <DeleteGoalButton id={goal.id} />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {goal.title}
        </h2>

        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
            {new Date(goal.date).toLocaleDateString()}
        </p>

        <TaskList goalId={goal.id} />

        <div className="mt-2">
            <GoalCompletedCheckbox goal={goal} />
        </div>
    </Card>
);

export default GoalCard;
