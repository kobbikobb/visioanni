import { createFileRoute } from '@tanstack/react-router';
import GoalPage from '@/components/GoalsPage';

export const Route = createFileRoute('/goals')({
    component: GoalsComponent
});

function GoalsComponent() {
    return <GoalPage />;
}
