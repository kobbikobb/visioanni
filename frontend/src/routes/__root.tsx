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

const NavigationBar = () => {
    return (
        <div className="p-4 flex justify-between max-w-5xl m-auto items-baseline">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-100">
                VisioAnni
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {' '}
                    — Goal & Habit Tracker
                </span>
            </h1>
            <div className="flex gap-2">
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
        </div>
    );
};

const Root = () => {
    return (
        <>
            <NavigationBar />
            <hr />
            <div className="mp-2 gap-2 max-w-5xl mx-auto p-4">
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
