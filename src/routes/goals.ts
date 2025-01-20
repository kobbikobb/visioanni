import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Goal = {
    id: number;
    title: string;
    date: string;
    description: string;
    completed: boolean;
};

const mockGoals = [
    {
        id: 1,
        title: 'Goal 1',
        date: '2021-01-01',
        description: 'This is the first goal',
        completed: false
    },
    {
        id: 2,
        title: 'Goal 2',
        date: '2021-01-02',
        description: 'This is the second goal',
        completed: false
    },
    {
        id: 3,
        title: 'Goal 3',
        date: '2021-01-03',
        description: 'This is the third goal',
        completed: false
    }
];

const getMockGoals = (): Goal[] => {
    return mockGoals;
};

const goalPostSchema = z.object({
    title: z.string().min(1),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in the format yyyy-MM-dd'),
    description: z.string(),
    completed: z.boolean()
});

export const goalsRoute = new Hono()
    .get('/', (c) => {
        return c.json({ goals: getMockGoals() });
    })
    .post('/', zValidator('json', goalPostSchema), async (c) => {
        const goalInput = c.req.valid('json');
        const goal: Goal = { id: mockGoals.length + 1, ...goalInput };
        mockGoals.push(goal);
        return c.json(goal);
    });
