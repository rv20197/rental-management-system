import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Key, 
  Users, 
  Package, 
  ReceiptText, 
  LogOut 
} from "lucide-react";
import { cn } from "../lib/utils";
import api from "../api";
import { ThemeToggle } from "./ThemeToggle";
import {Button} from "@/components/ui/button.tsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rentals", label: "Rentals", icon: Key },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/items", label: "Items", icon: Package },
  { to: "/billings", label: "Billings", icon: ReceiptText },
];

export function Sidebar() {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    }
    sessionStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col h-screen w-64 border-r bg-card text-card-foreground">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Rental Manager</h1>
        <ThemeToggle />
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Logout
        </Button>
      </div>
    </div>
  );
}
