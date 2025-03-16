import { createFileRoute } from '@tanstack/react-router';
import GoalPage from '@/components/GoalsPage';

export const Route = createFileRoute('/_authenticated/goals')({
    component: Goals
});

function Goals() {
    return <GoalPage />;
}
