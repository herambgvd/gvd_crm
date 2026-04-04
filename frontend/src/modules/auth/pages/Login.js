import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Either username or password is wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Flowops
            </h1>
            <h2 className="mt-6 text-lg font-semibold">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome to Flowops - Multi-Channel CRM System
            </p>
          </div>

          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit}
            data-testid="login-form"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  data-testid="email-input"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right side - Image */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1763567709942-2bfb3532f698?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBtaW5pbWFsaXN0JTIwb2ZmaWNlJTIwYXJjaGl0ZWN0dXJlJTIwYWJzdHJhY3R8ZW58MHx8fHwxNzY4MjQxNTI4fDA&ixlib=rb-4.1.0&q=85)",
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
    </div>
  );
};

export default Login;
