import { StudioProvider } from "@/features/studio/context/studio-context";
import Sidebar from "@/features/studio/components/sidebar";
import MobileNav from "@/features/studio/components/mobile-nav";
import AnnouncementDialog from "@/features/studio/components/announcement-dialog";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioProvider>
      <div className="flex flex-col md:flex-row h-screen bg-[#faf9f6] text-[#1a1a1a] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <MobileNav />
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden relative">
          {children}
        </main>
      </div>
      <AnnouncementDialog />
    </StudioProvider>
  );
}
