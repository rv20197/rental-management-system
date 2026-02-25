import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useLoginMutation } from "../api/authApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () => email && password && !isLoading,
    [email, password, isLoading]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await login({ email, password }).unwrap();
      sessionStorage.setItem("token", response.token);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      const message = err?.data?.message || "Login failed";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Sign in to your rental management account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="error" className="mb-4">
              <p className="text-sm font-medium">{error}</p>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full mt-6" disabled={!isFormValid}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                Don't have an account?
              </span>
            </div>
          </div>

          {/* Signup Link */}
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">
              <Link
                to="/signup"
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
