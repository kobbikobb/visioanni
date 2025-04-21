import React from 'react';
import { ReactNode } from 'react';

interface PageHeaderProps {
    children?: ReactNode;
}

const PageHeader = ({ children }: PageHeaderProps) => {
    return (
        <div className="md:p-4 rounded-xl bg-purple-100 dark:bg-purple-700 border border-purple-500 dark:border-purple-600">
            {children}
        </div>
    );
};

export default PageHeader;
