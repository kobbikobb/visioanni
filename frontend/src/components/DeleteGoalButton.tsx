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
            className="hover:bg-red-100"
        >
            <Trash className="h-4 w-4 text-red-700" />
        </Button>
    );
};

export default DeleteGoalButton;
