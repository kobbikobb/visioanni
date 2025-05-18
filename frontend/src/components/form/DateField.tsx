import React from 'react';
import { useFieldContext } from './context';
import DatePicker from './DatePicker';
import { toDateString } from '../utils/dateUtils';

export const DateField = ({ label }: { label: string }) => {
    const field = useFieldContext<string | undefined>();
    return (
        <label>
            <div>{label}</div>
            <DatePicker
                value={
                    field.state.value ? new Date(field.state.value) : undefined
                }
                onChange={(value) =>
                    field.handleChange(value ? toDateString(value) : undefined)
                }
                className="mt-1"
            />
            {field.state.meta.errors.length > 0 ? (
                <em className="text-red-600">
                    {field.state.meta.errors.map((e) => e.message).join(', ')}
                </em>
            ) : null}
        </label>
    );
};
