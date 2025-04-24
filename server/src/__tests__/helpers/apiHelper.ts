import app from '../../app';

export const aGoal = () => {
    return {
        title: 'New Goal',
        date: '2021-01-01'
    };
};

export const getData = (path: string) => {
    return app.request(path);
};

export const postData = (path: string, obj: object) => {
    return app.request(path, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

export const putData = (path: string, obj: object) => {
    return app.request(path, {
        method: 'PUT',
        body: JSON.stringify(obj),
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

export const deleteData = (path: string) => {
    return app.request(path, {
        method: 'DELETE'
    });
};
