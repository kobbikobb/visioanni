import { createFileRoute } from '@tanstack/react-router';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const Route = createFileRoute('/_authenticated/profile')({
    component: Profile
});

function Profile() {
    const { user, isUserPending } = useCurrentUser();

    if (isUserPending) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <div>Not logged in</div>;
    }

    return <div>Your profile: {user.given_name}</div>;
}
