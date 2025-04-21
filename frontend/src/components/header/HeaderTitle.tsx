import { ReactNode } from 'react';

interface HeaderTitleProps {
    children: ReactNode;
}

const HeaderTitle = ({ children }: HeaderTitleProps) => {
    return (
        <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {children}
        </h1>
    );
};

export default HeaderTitle;
