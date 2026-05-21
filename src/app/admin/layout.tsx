import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, parseAdminSessionToken } from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";

import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const session = await parseAdminSessionToken({ token });

  if (session?.email !== getRequiredEnv("ADMIN_EMAIL")) {
    redirect("/admin/login");
  }

  return (
    <>
      <header className="admin-bar">
        <nav aria-label="Admin navigation">
          <Link href="/admin/photos">Photos</Link>
          <Link href="/admin/photos/upload">Upload</Link>
          <Link href="/admin/tags">Tags</Link>
          <Link href="/admin/collections">Collections</Link>
        </nav>
        <LogoutButton />
      </header>
      {children}
    </>
  );
}
