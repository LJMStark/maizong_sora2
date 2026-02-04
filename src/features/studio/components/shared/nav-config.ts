export const NAV_ITEMS = [
  { path: "/studio", icon: "image", labelKey: "imageWorkshop" },
  { path: "/studio/video", icon: "video_camera_back", labelKey: "videoWorkshop" },
  { path: "/studio/assets", icon: "grid_view", labelKey: "collections" },
  { path: "/studio/subscription", icon: "payments", labelKey: "subscription" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
