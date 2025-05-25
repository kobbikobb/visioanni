import React from 'react';
import { useFieldContext } from './context';

export const TextField = ({
    label,
    placeholder
}: {
    label?: string;
    placeholder: string;
}) => {
    const field = useFieldContext<string>();
    return (
        <label>
            {label ?? <div>{label}</div>}
            <input
                type="text"
                placeholder={placeholder}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full mt-2 pl-3 pt-2 pb-2 mb-3 rounded-md border border-gray-600"
            />
            {field.state.meta.errors.length > 0 ? (
                <em className="text-red-600">
                    {field.state.meta.errors.map((e) => e.message).join(', ')}
                </em>
            ) : null}
        </label>
    );
};
