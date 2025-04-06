import { createFormHook } from '@tanstack/react-form';
import { fieldContext, formContext } from './context';
import { TextField } from './TextField';
import { DateField } from './DateField';
import { SubscribeButton } from './SubscribeButton';

export const { useAppForm } = createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
        TextField,
        DateField
    },
    formComponents: {
        SubscribeButton
    }
});
