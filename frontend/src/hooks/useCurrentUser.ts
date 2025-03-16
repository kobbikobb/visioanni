import { getCurrentUser } from '@/api/userApi';
import { useQuery } from '@tanstack/react-query';

const useCurrentUser = () => {
    const { data: user, isPending: isUserPending } = useQuery({
        queryKey: ['get-current-user'],
        queryFn: getCurrentUser
    });
    return { user, isUserPending };
};

export default useCurrentUser;
