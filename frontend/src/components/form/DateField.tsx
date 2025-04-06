import { useFieldContext } from './context';

export const DateField = ({ label }: { label: string }) => {
    // NOTE: Dates are stored as strings
    const field = useFieldContext<string>();
    return (
        <label>
            <div>{label}</div>
            <input
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full p-3 mb-3 rounded-md border"
            />
            {field.state.meta.errors.length > 0 ? (
                <em className="text-red-600">
                    {field.state.meta.errors.map((e) => e.message).join(', ')}
                </em>
            ) : null}
        </label>
    );
};
