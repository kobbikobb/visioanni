import React from 'react';
import { useAppForm } from '../form';
import { useCreateGoalTask } from '@/hooks/useCreateGoalTask';
import { useGoalTasks } from '@/hooks/useGoalTasks';
import DeleteTaskButton from './DeleteTaskButton';

const GoalTasksList = ({ goalId }: { goalId: number }) => {
    const { tasks } = useGoalTasks({ goalId });

    const { createTask } = useCreateGoalTask({
        goalId,
        onSuccessFn: () => {
            form.reset();
        }
    });

    const form = useAppForm({
        defaultValues: {
            title: ''
        },
        onSubmit: async ({ value }) => {
            const { title } = value;
            createTask({ title });
        }
    });

    return (
        <div>
            <div className="space-y-2 mt-3">
                <h4 className="text-sm font-medium">Tasks</h4>
                {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No tasks yet. Add a task to get started.
                    </p>
                ) : (
                    <ul className="space-y-1 border border-gray-600 rounded-md pl-3 pt-1 pb-1">
                        {tasks.map((task) => (
                            <li
                                className="flex justify-between items-center"
                                key={task.id}
                            >
                                {task.title}
                                <div>
                                    <DeleteTaskButton
                                        goalId={goalId}
                                        taskId={task.id}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <form.AppField
                    name="title"
                    children={(field) => (
                        <field.TextField placeholder="Add task" />
                    )}
                />
            </form>
        </div>
    );
};

export default GoalTasksList;
