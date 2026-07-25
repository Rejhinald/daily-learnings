import { BookA, BookOpen, FolderGit2, House, Tags } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/glossary", label: "Glossary", icon: BookA },
  { href: "/about", label: "About", icon: BookOpen },
] as const;

/** Marks a nav item active, treating section roots as matching their children. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
