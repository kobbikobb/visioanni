import React, { useState } from 'react';
import { useCreateGoal } from '@/hooks/useCreateGoal';
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
import { useAppForm } from '@/components/form';
import { goalPostSchema } from '@server/sharedTypes';
import { toDateString } from '../utils/dateUtils';

const AddGoalDialgo: React.FC = () => {
    const [open, setOpen] = useState(false);

    const { createGoal } = useCreateGoal({
        onSuccessFn: () => {
            setOpen(false);
            form.reset();
        }
    });

    const form = useAppForm({
        defaultValues: {
            title: '',
            date: toDateString(new Date())
        },
        validators: {
            onChange: goalPostSchema
        },
        onSubmit: async (values) => {
            const { title, date } = values.value;
            createGoal({ title, date });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Goal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Goal</DialogTitle>
                </DialogHeader>

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
                            <field.TextField
                                label="Title"
                                placeholder="Enter title"
                            />
                        )}
                    />

                    <form.AppField
                        name="date"
                        children={(field) => <field.DateField label="Date" />}
                    />

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => form.reset()}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <form.AppForm>
                                <form.SubscribeButton label="Save" />
                            </form.AppForm>
                        </DialogClose>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddGoalDialgo;
