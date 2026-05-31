import { useEffect } from "react";

/**
 * Staff Tablet login is unified with the main Rakz platform login.
 * Any visit to /staff/login is redirected to the central gateway at /login.
 * After authentication, workers are automatically returned here via smart redirect.
 */
export default function Login() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );
}
