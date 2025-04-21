import React from 'react';
import { Link } from '@tanstack/react-router';
import Card from '../content/Card';
import PageHeader from '../header/PageHeader';
import HeaderTitle from '../header/HeaderTitle';

const HomePage = () => (
    <main>
        <section className="space-y-4">
            <PageHeader>
                <HeaderTitle>Welcome to VisioAnni</HeaderTitle>
                <p className="text-lg mt-1 text-gray-700 dark:text-gray-300">
                    Plan your goals, build supporting habits, and track your
                    progress with clarity and focus.
                </p>
            </PageHeader>
            <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard
                    title="Set Goals"
                    description="Define your long-term goals with clear timelines."
                    to="/goals"
                />
                <FeatureCard
                    title="Build Habits"
                    description="Create habits that support your goals and stay consistent."
                    to="/habits"
                />
                <FeatureCard
                    title="Track Tasks"
                    description="Break down your goals into actionable tasks and mark progress."
                    to="/goals"
                />
                <FeatureCard
                    title="Monitor Progress"
                    description="Get a visual overview of how you're doing over time."
                    to="/goals"
                />
            </div>
        </section>
    </main>
);

interface FeatureCardProps {
    title: string;
    description: string;
    to: string;
}

const FeatureCard = ({ title, description, to }: FeatureCardProps) => (
    <Card>
        <Link to={to}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
            </p>
        </Link>
    </Card>
);

export default HomePage;
