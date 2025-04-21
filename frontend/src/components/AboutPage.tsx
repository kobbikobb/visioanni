import React from 'react';
import Card from './Card';
import PageHeader from './PageHeader';

export default function AboutPage() {
    return (
        <main>
            <section className="space-y-4">
                <PageHeader>
                    <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        About VisioAnni
                    </h1>
                </PageHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FeatureCard
                        title="Contribute yourself"
                        description="VisioAnni is an open source project anyone can contribute to!"
                    />
                    <FeatureCard
                        title="Questions and feedback"
                        description="See our open source GitHub repository."
                    />
                </div>
            </section>
        </main>
    );
}

interface FeatureCardProps {
    title: string;
    description: string;
}

const FeatureCard = ({ title, description }: FeatureCardProps) => (
    <Card>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
        </p>
    </Card>
);
