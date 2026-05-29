import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false
  }
};

export default function AuthAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
