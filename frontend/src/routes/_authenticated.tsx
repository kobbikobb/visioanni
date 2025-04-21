import { createFileRoute, Outlet } from '@tanstack/react-router';
import { userQueryOptions } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';

const Login = () => {
    return (
        <div className="max-w-md mx-auto mt-24 px-4 text-center">
            <h1 className="text-2xl font-semibold mb-4">Log in to Continue</h1>
            <p className="text-muted-foreground mb-4">
                To access your goals, habits, and progress tracking, please log
                in with your{' '}
                <span className="font-semibold text-foreground">
                    Google account
                </span>
                .
            </p>
            <Button asChild>
                <a href="/api/login">Login</a>
            </Button>
        </div>
    );
};

const Component = () => {
    const { user } = Route.useRouteContext();
    if (!user) {
        return <Login />;
    }
    return <Outlet />;
};

export const Route = createFileRoute('/_authenticated')({
    beforeLoad: async ({ context }) => {
        try {
            const queryClinet = context.queryClient;
            const user = await queryClinet.fetchQuery(userQueryOptions);
            return { user };
        } catch (error) {
            console.error(error);
            return { user: null };
        }
    },
    component: Component
});
