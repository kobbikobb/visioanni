import React from 'react';
import Card from '../content/Card';
import PageHeader from '../header/PageHeader';
import HeaderTitle from '../header/HeaderTitle';

export default function AboutPage() {
    return (
        <main>
            <section className="space-y-4">
                <PageHeader>
                    <HeaderTitle>About VisioAnni</HeaderTitle>
                </PageHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FeatureCard
                        title="About the Author"
                        description="I am Jakob, a Software Developer from Iceland."
                    />
                    <FeatureCard
                        title="Best Practices"
                        description="Quality code and best practices!"
                    />
                    <FeatureCard
                        title="Contribute Yourself"
                        description="VisioAnni is an open source project anyone can contribute to!"
                    />
                    <FeatureCard
                        title="Questions & Feedback"
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
