import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useRegisterMutation } from "../api/authApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Alert } from "../components/ui/alert";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("manager");
  const [register, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const passwordsMatch = useMemo(
    () => !password || !confirmPassword || password === confirmPassword,
    [password, confirmPassword]
  );

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordMatch(value === confirmPassword);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setPasswordMatch(password === value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await register({ name: fullName, email, password, role }).unwrap();
      toast.success("Account created successfully. Please login.");
      navigate("/login");
    } catch (err: any) {
      const message = err?.data?.message || "Signup failed. Please try again.";
      setError(message);
      toast.error(message);
    }
  };

  const isFormValid =
    firstName.trim() &&
    email &&
    password &&
    confirmPassword &&
    passwordsMatch &&
    !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Join Us
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Create your rental management account
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
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-semibold">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-semibold">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                At least 8 characters recommended
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                required
                className={`mt-1 ${!passwordMatch ? "border-red-500" : ""}`}
              />
              {!passwordMatch && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <Label htmlFor="role" className="text-sm font-semibold">
                Account Role
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "manager")}
                className="block w-full mt-1 rounded-md border border-slate-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-700 dark:text-white"
              >
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full mt-6" disabled={!isFormValid}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
