import React from 'react';
import { useAppForm } from '../form';
import { useCreateGoalTask } from '@/hooks/useCreateGoalTask';
import { useGoalTasks } from '@/hooks/useGoalTasks';

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
            <div className="mt-4 space-y-4">
                {tasks.map((task) => (
                    <div key={task.id}>{task.title}</div>
                ))}
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
                        <field.TextField placeholder="Enter task title" />
                    )}
                />
            </form>
        </div>
    );
};

export default GoalTasksList;
