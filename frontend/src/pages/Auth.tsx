import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Activity, Eye, EyeOff } from "lucide-react";
import {
  isPlanAdminCredentials,
  signInPlanAdmin,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/services/auth";

function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  error,
  show,
  onToggle,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (isSignUp: boolean) => {
    const e: Record<string, string> = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "At least 6 characters";
    if (isSignUp && password !== confirmPw) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handle = async (isSignUp: boolean) => {
    setFormError(null);
    if (!validate(isSignUp)) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else if (isPlanAdminCredentials(email, password)) {
        signInPlanAdmin();
        navigate("/plans");
        return;
      } else {
        await signInWithEmail(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">HealthSync</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track nutrition, workouts, and health goals
            </p>
          </div>
        </div>

        <Card className="border-border/50">
          <Tabs defaultValue="signin">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Sign In */}
            <TabsContent value="signin">
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input
                    id="email-in"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <PasswordField
                  id="pw-in"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  show={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                />
                <Button className="w-full" onClick={() => handle(false)} disabled={loading}>
                  Sign In
                </Button>
              </CardContent>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <CardContent className="space-y-4">
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <PasswordField
                  id="pw-up"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  show={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                />
                <PasswordField
                  id="pw-confirm"
                  label="Confirm Password"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  error={errors.confirm}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
                <Button className="w-full" onClick={() => handle(true)} disabled={loading}>
                  Create Account
                </Button>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
