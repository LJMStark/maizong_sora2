import { Suspense } from "react";
import VideoWorkshop from "@/features/studio/components/video-workshop";

function VideoWorkshopWrapper() {
  return <VideoWorkshop />;
}

export default function VideoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <VideoWorkshopWrapper />
    </Suspense>
  );
}
