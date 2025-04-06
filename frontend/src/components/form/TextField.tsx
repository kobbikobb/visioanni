import { useFieldContext } from './context';

export const TextField = ({
    label,
    placeholder
}: {
    label: string;
    placeholder: string;
}) => {
    const field = useFieldContext<string>();
    return (
        <label>
            <div>{label}</div>
            <input
                type="text"
                placeholder={placeholder}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full p-3 mb-3 rounded-md border"
            />
        </label>
    );
};
