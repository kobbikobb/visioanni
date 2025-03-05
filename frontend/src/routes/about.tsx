import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
    component: RouteComponent
});

function RouteComponent() {
    return <div>About this app... "/about"!</div>;
}
