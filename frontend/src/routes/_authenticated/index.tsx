import { createFileRoute } from '@tanstack/react-router';

const Index = () => <div>Welcome home "/"!</div>;

export const Route = createFileRoute('/_authenticated/')({
    component: Index
});
