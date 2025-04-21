import React from 'react';
import AddGoalDialog from './AddGoalDialog';
import PageHeader from '../header/PageHeader';
import HeaderTitle from '../header/HeaderTitle';

const GoalListHeader = () => {
    return (
        <PageHeader>
            <div className="flex items-center justify-between">
                <HeaderTitle>Goals</HeaderTitle>
                <AddGoalDialog />
            </div>
        </PageHeader>
    );
};

export default GoalListHeader;
