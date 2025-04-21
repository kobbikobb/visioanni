import React from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PageHeader from './PageHeader';

const ProfilePage = () => {
    const { user, isUserPending } = useCurrentUser();

    if (isUserPending) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <div>Not logged in</div>;
    }

    return (
        <PageHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={user.picture ?? ''} />
                        <AvatarFallback>
                            {user.given_name?.substring(0, 1)}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        You are logged in, {user.given_name}
                    </h1>
                </div>

                <div className="ml-auto">
                    <Button asChild>
                        <a href="/api/logout">Logout</a>
                    </Button>
                </div>
            </div>
        </PageHeader>
    );
};

export default ProfilePage;
