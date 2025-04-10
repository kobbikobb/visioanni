import { createFileRoute } from '@tanstack/react-router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

    return (
        <div className="flex items-center p-4 gap-4 bg-muted rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={user.picture ?? ''} />
                    <AvatarFallback>
                        {user.given_name?.substring(0, 1)}
                    </AvatarFallback>
                </Avatar>
                <div className="text-sm font-medium text-foreground">
                    Welcome, {user.given_name}
                </div>
            </div>

            <div className="ml-auto">
                <Button asChild>
                    <a href="/api/logout">Logout</a>
                </Button>
            </div>
        </div>
    );
}
