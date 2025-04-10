import { createFileRoute } from '@tanstack/react-router';

const About = () => <div>About this app... "/about"!</div>;

export const Route = createFileRoute('/about')({
    component: About
});
