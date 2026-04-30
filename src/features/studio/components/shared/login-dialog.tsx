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
import { LogIn, Mail, UserPlus } from "lucide-react";

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

  const handleNavigation = (path: string) => {
    router.push(path);
    // 延迟关闭对话框，确保路由跳转先执行
    setTimeout(() => onOpenChange(false), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[18px] border-[#e5e5e5] bg-white sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#f0f0f0] text-[#0d0d0d]">
              <LogIn className="size-7" strokeWidth={1.9} />
            </div>
          </div>
          <DialogTitle className="text-[26px] font-normal text-[#0d0d0d]">
            {tAuth("welcomeDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-[#777]">
            {tAuth("welcomeDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => handleNavigation("/signin")}
            className="h-[52px] w-full rounded-full bg-[#0d0d0d] text-[16px] font-medium text-white hover:bg-[#2a2a2a]"
          >
            <Mail className="size-4" strokeWidth={1.9} />
            {tAuth("signInWithEmail")}
          </Button>
          <Button
            onClick={() => handleNavigation("/signup")}
            variant="outline"
            className="h-[52px] w-full rounded-full border-[#d9d9d9] text-[16px] font-medium text-[#0d0d0d] hover:bg-[#f7f7f7]"
          >
            <UserPlus className="size-4" strokeWidth={1.9} />
            {tSignup("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
