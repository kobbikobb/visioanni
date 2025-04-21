import ProfilePage from '@/components/profile/ProfilePage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/profile')({
    component: ProfilePage
});
