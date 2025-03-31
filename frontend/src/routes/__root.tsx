import React, { Suspense } from 'react';
import {
    createRootRouteWithContext,
    Link,
    Outlet
} from '@tanstack/react-router';
import { type QueryClient } from '@tanstack/react-query';

interface RouterContext {
    queryClient: QueryClient;
}

const TanStackRouterDevtools =
    process.env.NODE_ENV === 'production'
        ? () => null // Render nothing in production
        : React.lazy(() =>
              import('@tanstack/router-devtools').then((res) => ({
                  default: res.TanStackRouterDevtools
              }))
          );

const Nav = () => {
    return (
        <div className="p-2 flex gap-2 max-w-2xl m-auto">
            <Link to="/" className="[&.active]:font-bold">
                Home
            </Link>{' '}
            <Link to="/goals" className="[&.active]:font-bold">
                Goals
            </Link>
            <Link to="/profile" className="[&.active]:font-bold">
                Profile
            </Link>
            <Link to="/about" className="[&.active]:font-bold">
                About
            </Link>
        </div>
    );
};

const Root = () => {
    return (
        <>
            <Nav />
            <hr />
            <div className="mp-2 gap-2 max-w-4xl mx-auto p-4">
                <Outlet />
            </div>
            <Suspense>
                <TanStackRouterDevtools />
            </Suspense>
        </>
    );
};

export const Route = createRootRouteWithContext<RouterContext>()({
    component: Root
});
