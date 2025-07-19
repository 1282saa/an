import React, { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, theme, toggleTheme }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Header theme={theme} toggleTheme={toggleTheme} />

      <main className="flex-grow">{children}</main>

      <Footer />
    </div>
  );
};

export default Layout;
