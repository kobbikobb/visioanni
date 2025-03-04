import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import GoalForm from './components/GoalForm';
import GoalList from './components/GoalList';

const queryClient = new QueryClient();

function App() {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <GoalForm />
                <GoalList />
            </QueryClientProvider>
        </>
    );
}

export default App;
