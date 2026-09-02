import { requireEventManager } from "@/lib/auth/require-user";
export default async function ChatLayout({ children }: { children: React.ReactNode }) { await requireEventManager(); return children; }
