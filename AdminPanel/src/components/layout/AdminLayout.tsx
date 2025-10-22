import { useState } from "react";
import { useLocation, matchPath } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ConfirmProvider } from "../ui/ConfirmDialog";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // check if current path matches seat-config/:id or seatMapEditor
  const hideSidebar =
    matchPath("/seat-config/:id", location.pathname) ||
    location.pathname.includes("seatMapEditor");

  return (
    <ConfirmProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar (render only if hidden) */}
        {!hideSidebar && (
          <Sidebar isOpen={sidebarOpen} onClose={setSidebarOpen} />
        )}

        {/* Main content */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            hideSidebar ? "" : "lg:ml-64"
          }`}
        >
          <main className="flex-1 overflow-y-auto">
            <div>{children}</div>
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
};

export default AdminLayout;
