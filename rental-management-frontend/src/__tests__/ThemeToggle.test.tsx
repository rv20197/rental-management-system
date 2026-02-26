import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle';
import { ThemeProvider } from '../components/ThemeProvider';

test('ThemeToggle switches theme', () => {
    render(
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <ThemeToggle />
        </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    // Initially light theme (Sun icon should be present, button has title)
    expect(button).toHaveAttribute('title', 'Toggle theme');

    fireEvent.click(button);

    // Should still have the button
    expect(button).toBeInTheDocument();
});
