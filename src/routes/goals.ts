import { Hono } from "hono";

type Goal = {
    id: string;
    title: string;
    date: string;
    description: string;
    completed: boolean;
};

const getMockGoals = (): Goal[] => {
    return [
        {
            id: "1",
            title: "Goal 1",
            date: "2021-01-01",
            description: "This is the first goal",
            completed: false,
        },
        {
            id: "2",
            title: "Goal 2",
            date: "2021-01-02",
            description: "This is the second goal",
            completed: false,
        },
        {
            id: "3",
            title: "Goal 3",
            date: "2021-01-03",
            description: "This is the third goal",
            completed: false,
        },
    ];
};

export const goalsRoute = new Hono()
    .get("/", (c) => {
        return c.json({ goals: getMockGoals() });
    })
    .post("/", (c) => {
        return c.json({});
    });
