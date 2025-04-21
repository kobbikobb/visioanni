import { createFileRoute } from '@tanstack/react-router';
import GoalPage from '@/components/goals/GoalsPage';

export const Route = createFileRoute('/_authenticated/goals')({
    component: GoalPage
});
