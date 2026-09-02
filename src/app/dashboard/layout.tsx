import { requireEventManager } from "@/lib/auth/require-user";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { await requireEventManager(); return children; }
