import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { callApi } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function FacebookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code || !state) {
        toast.error("Invalid Facebook callback parameters.");
        navigate("/profile");
        return;
      }

      if (!session?.access_token) {
        toast.error("You must be logged in to connect a Facebook account.");
        navigate("/login");
        return;
      }

      try { 
        await callApi('/auth/facebook/callback', {
          method: 'POST',
          body: JSON.stringify({ code, state })
        }, session);

        toast.success("Facebook account successfully connected!");
      } catch (error) {
        toast.error("Failed to connect Facebook: " + error.message);
      } finally {
        navigate("/profile");
      }
    };

    handleCallback();
  }, [searchParams, navigate, session]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" /> Connecting to Facebook...
      </h2>
      <p className="text-sm text-gray-500">Please wait while we secure your connection.</p>
    </div>
  );
}