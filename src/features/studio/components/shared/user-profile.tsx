"use client";

import React, { useSyncExternalStore } from "react";
import { MoreHorizontal } from "lucide-react";
import { getInitials } from "../../utils/user-helpers";

interface User {
  email?: string | null;
  image?: string | null;
  name?: string | null;
}

interface UserProfileProps {
  user: User | null;
  isPending: boolean;
  menuOpen?: boolean;
  onAccountClick: () => void;
  onLoginClick: () => void;
}

const UserProfileSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-1">
    <div className="size-8 animate-pulse rounded-full bg-[#e5e5e5]" />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-20 animate-pulse rounded bg-[#e5e5e5]" />
      <div className="h-2 w-12 animate-pulse rounded bg-[#e5e5e5]" />
    </div>
  </div>
);

const AuthenticatedUser: React.FC<{
  user: User;
  menuOpen?: boolean;
  onAccountClick: () => void;
}> = ({ user, menuOpen, onAccountClick }) => {
  const label = user.name || user.email || "小象用户";

  return (
    <button
      type="button"
      onClick={onAccountClick}
      aria-label={`账号菜单，${label}`}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      className="group flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-black/5"
    >
      {user.image ? (
        <span
          className="size-8 shrink-0 rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url("${user.image.replace(/"/g, "%22")}")` }}
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0f0f0f] text-xs font-medium text-white">
          {getInitials(label)}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] leading-5 text-[#0d0d0d]">
          {label}
        </span>
        <span className="truncate text-[13px] leading-4 text-[#6f6f6f]">
          {user.email || "管理账号"}
        </span>
      </span>
      <MoreHorizontal className="size-4 shrink-0 text-[#8a8a8a] opacity-0 transition group-hover:opacity-100" />
    </button>
  );
};

const GuestUser: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  return (
    <button
      onClick={onLoginClick}
      aria-label="登录小象万象保存作品和提示词"
      className="group flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-xs font-medium text-white">
        象
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="text-[15px] leading-5 text-[#0d0d0d]">登录小象万象</p>
        <p className="text-[13px] leading-4 text-[#6f6f6f]">保存作品和提示词</p>
      </div>
    </button>
  );
};

function subscribeHydration() {
  return () => undefined;
}

function getHydratedClientSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isPending,
  menuOpen,
  onAccountClick,
  onLoginClick,
}) => {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );

  if (!hydrated || isPending) {
    return <UserProfileSkeleton />;
  }

  if (user) {
    return (
      <AuthenticatedUser
        user={user}
        menuOpen={menuOpen}
        onAccountClick={onAccountClick}
      />
    );
  }

  return <GuestUser onLoginClick={onLoginClick} />;
};
