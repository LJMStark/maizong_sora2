"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { SocialAuthButtons } from "./social-auth-buttons";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const router = useRouter();
  const tAuth = useTranslations("auth.signin");
  const tSignup = useTranslations("auth.signup");
  const [email, setEmail] = React.useState("");

  const handleNavigation = (path: string) => {
    router.push(path);
    setTimeout(() => onOpenChange(false), 100);
  };

  const handleEmailContinue = () => {
    const value = email.trim();
    const query = value ? `?email=${encodeURIComponent(value)}` : "";
    handleNavigation(`/signin${query}`);
  };

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="studio-login"
        overlayClassName="z-[140] bg-black/80"
        wrapperClassName="z-[141]"
        className="isolate rounded-2xl border-[#e5e5e5] bg-white px-6 pb-8 pt-7 text-[#0d0d0d] shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-[390px]"
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#0d0d0d] text-sm font-semibold text-white">
              象
            </div>
          </div>
          <DialogTitle className="text-[28px] font-normal leading-tight text-[#0d0d0d]">
            {tAuth("welcomeDialog.title")}
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-[300px] text-[15px] leading-6 text-[#555]">
            {tAuth("welcomeDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <SocialAuthButtons />
        <div className="my-5 flex items-center gap-4 text-xs font-medium text-[#777]">
          <span className="h-px flex-1 bg-[#e8e8e8]" />
          或
          <span className="h-px flex-1 bg-[#e8e8e8]" />
        </div>
        <div className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleEmailContinue();
              }
            }}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="邮箱地址"
            aria-label="邮箱地址"
            className="h-12 rounded-full border border-[#d9d9d9] bg-white px-5 text-[15px] outline-none transition placeholder:text-[#8f8f8f] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
          />
          <Button
            onClick={handleEmailContinue}
            className="h-12 w-full rounded-full bg-[#0d0d0d] text-[15px] font-normal text-white hover:bg-[#2a2a2a]"
          >
            继续
          </Button>
          <Button
            onClick={() => handleNavigation("/signup")}
            variant="outline"
            className="h-12 w-full rounded-full border-[#d9d9d9] bg-white text-[15px] font-normal text-[#0d0d0d] hover:bg-[#f7f7f7]"
          >
            <UserPlus className="size-4" strokeWidth={1.9} />
            {tSignup("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
