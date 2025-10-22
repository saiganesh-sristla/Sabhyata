import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const Callback = () => {
  const { getIdTokenClaims, isAuthenticated, error } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingRedirectKey = "pendingRedirect";

  
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (error) {
      toast.error("Authentication failed: " + error.message);
      navigate("/login");
      return;
    }

    if (isAuthenticated) {
      getIdTokenClaims()
        .then((claims) => {
          const idToken = claims.__raw;

          fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                localStorage.setItem("token", data.data.token);
                localStorage.setItem("user", JSON.stringify(data.data.user));

                let returnTo =
                  location.state?.returnTo ||
                  localStorage.getItem(pendingRedirectKey) ||
                  "/";

                // 🧠 Fix: remove domain if a full URL is stored
                if (returnTo.startsWith("http")) {
                  const url = new URL(returnTo);
                  returnTo = url.pathname + url.search;
                }

                localStorage.removeItem(pendingRedirectKey);
                toast.success("Login successful!");
                navigate(returnTo, { replace: true });
              } else {
                toast.error(data.message || "Login failed");
                navigate("/login");
              }
            })
            .catch((err) => {
              toast.error("An error occurred: " + err.message);
              navigate("/login");
            });
        })
        .catch((err) => {
          toast.error("Failed to retrieve token: " + err.message);
          navigate("/login");
        });
    }
  }, [isAuthenticated, error, getIdTokenClaims, navigate, location.state]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#8B1538]"></div>
    </div>
  );
};

export default Callback; 