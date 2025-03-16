import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
    component: Index
});

function Index() {
    return <div>Welcome home "/"!</div>;
}
