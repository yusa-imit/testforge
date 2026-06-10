import { Link, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "./ui/toaster";
import GlobalSearch from "./GlobalSearch";

const navigation = [
  { name: "대시보드", href: "/" },
  { name: "서비스", href: "/services" },
  { name: "컴포넌트", href: "/components" },
  { name: "Self-Healing", href: "/healing" },
  { name: "Element Registry", href: "/registry" },
  { name: "실행 이력", href: "/runs" },
  { name: "성능 모니터링", href: "/metrics" },
  { name: "Webhooks", href: "/webhooks" },
  { name: "스케줄", href: "/schedules" },
  { name: "환경", href: "/environments" },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center space-x-2 shrink-0">
                <span className="text-2xl">🧪</span>
                <span className="text-xl font-bold text-gray-900">TestForge</span>
              </Link>
              <GlobalSearch />
            </div>
            <nav className="flex space-x-6">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
