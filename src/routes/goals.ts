import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Goal = {
    id: number;
    title: string;
    date: string;
    completed: boolean;
};

const mockGoals = [
    {
        id: 1,
        title: 'Goal 1',
        date: '2021-01-01',
        completed: false
    },
    {
        id: 2,
        title: 'Goal 2',
        date: '2021-01-02',
        completed: false
    },
    {
        id: 3,
        title: 'Goal 3',
        date: '2021-01-03',
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
    completed: z.boolean()
});

export const goalsRoute = new Hono()
    .get('/', (c) => {
        return c.json({ goals: getMockGoals() });
    })
    .get('/:id{[0-9]+}', (c) => {
        const id = Number.parseInt(c.req.param('id'));
        const goal = mockGoals.find((g) => g.id === id);
        if (!goal) {
            return c.json({ message: 'Goal not found' }, 404);
        }
        return c.json(goal);
    })
    .post('/', zValidator('json', goalPostSchema), (c) => {
        const goalInput = c.req.valid('json');
        const goal: Goal = { id: mockGoals.length + 1, ...goalInput };
        mockGoals.push(goal);
        return c.json(goal, 201);
    })
    .delete('/:id{[0-9]+}', async (c) => {
        const id = Number.parseInt(c.req.param('id'));
        const index = mockGoals.findIndex((g) => g.id === id);
        if (index === -1) {
            return c.notFound();
        }
        mockGoals.splice(index, 1);

        c.status(204);
        return c.body('');
    });
