import React from 'react';
import AddGoalDialog from './AddGoalDialog';
import PageHeader from './PageHeader';

const GoalListHeader = () => {
    return (
        <PageHeader>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    Goals
                </h1>
                <AddGoalDialog />
            </div>
        </PageHeader>
    );
};

export default GoalListHeader;
