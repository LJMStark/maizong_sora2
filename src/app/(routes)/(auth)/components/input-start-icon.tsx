import { LucideIcon } from "lucide-react";

export default function InputStartIcon({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-6 text-[#8a8a8a] peer-disabled:opacity-50">
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
