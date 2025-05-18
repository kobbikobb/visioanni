import React from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteGoalTask } from '@/hooks/useDeleteTask';

const DeleteTaskButton = ({
    goalId,
    taskId
}: {
    goalId: number;
    taskId: number;
}) => {
    const { deleteTask, isPending } = useDeleteGoalTask(goalId);

    return (
        <Button
            onClick={() => deleteTask({ goalId, taskId })}
            disabled={isPending}
            variant="ghost"
            className="text-gray-400 hover:text-red-500 transition-colors"
        >
            <Trash className="h-4 w-4 text-red-600" />
        </Button>
    );
};

export default DeleteTaskButton;
