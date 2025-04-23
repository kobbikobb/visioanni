import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';

interface DatePickerProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    className?: string;
}

const DatePicker = ({ value, onChange, className }: DatePickerProps) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (date: Date | undefined) => {
        onChange(date);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={'outline'}
                    className={cn(
                        'mb-3 p-3 w-full justify-start text-left font-normal',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, 'PPP') : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleSelect}
                />
            </PopoverContent>
        </Popover>
    );
};

export default DatePicker;
