"use client";

import React from "react";
import { getInitials } from "../../utils/user-helpers";

interface User {
  name?: string | null;
}

interface UserProfileProps {
  user: User | null;
  isPending: boolean;
  onSignOut: () => void;
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
  onSignOut: () => void;
}> = ({ user, onSignOut }) => {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0f0f0f] text-xs font-medium text-white">
        {getInitials(user.name || "U")}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[15px] leading-5 text-[#0d0d0d]">{user.name}</p>
        <button
          onClick={onSignOut}
          className="text-left text-[13px] leading-4 text-[#6f6f6f] transition-colors hover:text-[#0d0d0d]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};

const GuestUser: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  return (
    <button
      onClick={onLoginClick}
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

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isPending,
  onSignOut,
  onLoginClick,
}) => {
  if (isPending) {
    return <UserProfileSkeleton />;
  }

  if (user) {
    return <AuthenticatedUser user={user} onSignOut={onSignOut} />;
  }

  return <GuestUser onLoginClick={onLoginClick} />;
};
