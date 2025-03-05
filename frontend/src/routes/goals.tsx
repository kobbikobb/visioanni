import { createFileRoute } from '@tanstack/react-router';
import GoalForm from '../components/GoalForm';
import GoalList from '../components/GoalList';

export const Route = createFileRoute('/goals')({
    component: GoalsComponent
});

function GoalsComponent() {
    return (
        <>
            <GoalForm />
            <GoalList />
        </>
    );
}
