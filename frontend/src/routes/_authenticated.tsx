import { createFileRoute, Outlet } from '@tanstack/react-router';
import { userQueryOptions } from '@/hooks/useCurrentUser';

const Login = () => {
    return (
        <div>
            <p>You have to login!</p>
            <a href="/api/login">Login</a>
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
