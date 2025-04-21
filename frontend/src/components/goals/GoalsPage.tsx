import React from 'react';
import GoalListHeader from './GoalListHeader';
import GoalList from './GoalsList';

export default function GoalPage() {
    return (
        <div>
            <GoalListHeader />
            <GoalList />
        </div>
    );
}
