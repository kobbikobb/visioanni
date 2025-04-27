import React from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteGoal } from '@/hooks/useDeleteGoal';

const DeleteGoalButton = ({ id }: { id: number }) => {
    const { deleteGoal, isPending } = useDeleteGoal();

    return (
        <Button
            onClick={() => deleteGoal(id)}
            disabled={isPending}
            variant="ghost"
            className="text-gray-400 hover:text-red-500 transition-colors"
        >
            <Trash className="h-4 w-4 text-red-600" />
        </Button>
    );
};

export default DeleteGoalButton;
