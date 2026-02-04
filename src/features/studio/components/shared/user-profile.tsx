"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-full bg-[#e5e5e1] animate-pulse" />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-20 bg-[#e5e5e1] rounded animate-pulse" />
      <div className="h-2 w-14 bg-[#e5e5e1] rounded animate-pulse" />
    </div>
  </div>
);

const AuthenticatedUser: React.FC<{
  user: User;
  onSignOut: () => void;
}> = ({ user, onSignOut }) => {
  const tAuth = useTranslations("auth.signin");

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-medium tracking-widest">
        {getInitials(user.name || "U")}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1a1a1a] truncate">
          {user.name}
        </p>
        <button
          onClick={onSignOut}
          className="text-xs text-[#4b5563] uppercase tracking-tighter text-left hover:text-[#1a1a1a] transition-colors"
        >
          {tAuth("signOut") || "退出登录"}
        </button>
      </div>
    </div>
  );
};

const GuestUser: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const tAuth = useTranslations("auth.signin");

  return (
    <button
      onClick={onLoginClick}
      className="flex items-center gap-3 w-full group"
    >
      <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#e5e5e1] text-[#4b5563] flex items-center justify-center group-hover:border-[#1a1a1a] group-hover:text-[#1a1a1a] transition-colors">
        <span className="material-symbols-outlined text-lg">person</span>
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-xs font-semibold text-[#1a1a1a]">{tAuth("title")}</p>
        <p className="text-xs text-[#4b5563] uppercase tracking-tighter">
          {tAuth("getStarted")}
        </p>
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
