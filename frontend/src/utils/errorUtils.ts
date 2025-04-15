export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
};
