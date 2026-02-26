import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../components/Sidebar";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../components/ThemeProvider";
import { vi, describe, test, expect } from "vitest";
import api from "../api";

// Mock the api module
vi.mock("../api", () => ({
    default: {
        post: vi.fn(),
    },
}));

// Mock window.location
const originalLocation = window.location;
delete (window as any).location;
(window as any).location = { ...originalLocation, href: "" };

describe("Sidebar Component", () => {
    const renderSidebar = () => {
        return render(
            <BrowserRouter>
                <ThemeProvider>
                    <Sidebar />
                </ThemeProvider>
            </BrowserRouter>
        );
    };

    test("renders navigation links correctly", () => {
        renderSidebar();

        expect(screen.getByText("Rental Manager")).toBeInTheDocument();
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Rentals")).toBeInTheDocument();
        expect(screen.getByText("Customers")).toBeInTheDocument();
        expect(screen.getByText("Items")).toBeInTheDocument();
        expect(screen.getByText("Billings")).toBeInTheDocument();
    });

    test("handles logout correctly", async () => {
        renderSidebar();

        const logoutButton = screen.getByText("Logout");
        fireEvent.click(logoutButton);

        // Verify API call
        expect(api.post).toHaveBeenCalledWith("/auth/logout");

        // Verify cleanup (using a small timeout since handleLogout is async)
        await vi.waitFor(() => {
            expect(window.location.href).toBe("/login");
        });
    });
});
