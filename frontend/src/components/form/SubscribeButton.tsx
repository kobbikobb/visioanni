import { Button } from '@/components/ui/button';
import { useFormContext } from './context';

export const SubscribeButton = ({ label }: { label: string }) => {
    const form = useFormContext();
    return (
        <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting: boolean) => (
                <Button disabled={isSubmitting}>{label}</Button>
            )}
        </form.Subscribe>
    );
};
