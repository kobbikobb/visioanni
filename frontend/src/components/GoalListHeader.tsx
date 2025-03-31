import AddGoalDialog from './AddGoalDialog';

const GoalListHeader = () => {
    return (
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-center mb-6">
                Goals List
            </h1>
            <AddGoalDialog />
        </div>
    );
};

export default GoalListHeader;
