import AddGoalDialog from './AddGoalDialog';

const GoalListHeader = () => {
    return (
        <div className="flex items-center justify-between p-4 mb-6 bg-muted rounded-xl shadow-sm">
            <h1 className="text-2xl font-semibold text-foreground">
                Goals List
            </h1>
            <AddGoalDialog />
        </div>
    );
};

export default GoalListHeader;
