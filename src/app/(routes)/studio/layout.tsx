import { StudioProvider } from "@/features/studio/context/studio-context";
import StudioShell from "@/features/studio/components/studio-shell";
import AnnouncementDialog from "@/features/studio/components/announcement-dialog";
import { Suspense } from "react";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioProvider>
      <Suspense fallback={<div className="h-screen bg-white" />}>
        <StudioShell>{children}</StudioShell>
      </Suspense>
      <AnnouncementDialog />
    </StudioProvider>
  );
}
