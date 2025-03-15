import React, { Suspense } from 'react';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

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
        <div className="p-2 flex gap-2">
            <Link to="/" className="[&.active]:font-bold">
                Home
            </Link>{' '}
            <Link to="/goals" className="[&.active]:font-bold">
                Goals
            </Link>
            <Link to="/about" className="[&.active]:font-bold">
                About
            </Link>
            <Link to="/logout" className="[&.active]:font-bold">
                Logout
            </Link>
        </div>
    );
};

const Root = () => {
    return (
        <>
            <Nav />
            <hr />
            <Outlet />
            <Suspense>
                <TanStackRouterDevtools />
            </Suspense>
        </>
    );
};

export const Route = createRootRoute({
    component: Root
});
