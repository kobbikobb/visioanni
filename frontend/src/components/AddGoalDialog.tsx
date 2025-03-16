import React, { useState } from 'react';
import useCreateGoal from '@/hooks/useCreateGoal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';

// TOOD: Use Input
// TODO: Proper Date Picker
// TODO: Per Field Errors
// TODO: Show errors properly

const AddGoalDialgo: React.FC = () => {
    const [open, setOpen] = useState(false);

    const {
        title,
        date,
        status,
        handleTitleChange,
        handleDateChange,
        handleCreateGoal
    } = useCreateGoal();

    const onHandleCreateGoal = async () => {
        await handleCreateGoal();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Add Goal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Goal</DialogTitle>
                </DialogHeader>

                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={handleTitleChange}
                    className="w-full p-3 mb-3 rounded-md border"
                />
                <input
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    className="w-full p-3 mb-3 rounded-md border"
                />
                {status && (
                    <p className="mt-4 text-center text-gray-600">{status}</p>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            cancel
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            type="submit"
                            variant="default"
                            onClick={onHandleCreateGoal}
                        >
                            Add Goal
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddGoalDialgo;
