// components/ui/AuthDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserCircle, LogIn } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export const AuthDialog = ({ 
  open, 
  onOpenChange, 
  title = "Authentication Required",
  description = "Please login or register to continue with this action."
}: AuthDialogProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onOpenChange(false);
    navigate('/login');
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-heritage-burgundy">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            onClick={handleLogin}
            className="w-full bg-heritage-burgundy hover:bg-heritage-burgundy/90 text-white py-6 text-lg font-semibold">
            <LogIn className="w-5 h-5 mr-2" />
            Login
          </Button>
        </div>
        
        <p className="text-xs text-center text-gray-500 pt-2">
          Create an account to save your preferences and track your interests
        </p>
      </DialogContent>
    </Dialog>
  );
};
