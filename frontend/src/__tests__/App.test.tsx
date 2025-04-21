import { describe, it, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
    it('should navigate to About', async () => {
        render(<App />);

        const aboutTab = screen.getByText(/About/i);
        expect(aboutTab).toBeInTheDocument();

        fireEvent.click(aboutTab);

        await waitFor(() => {
            const aboutContents = screen.getByText(/About VisioAnni/i);
            expect(aboutContents).toBeInTheDocument();
        });
    });
});
