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
    onOpenChange(false);
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[#e5e5e1] bg-white">
        <DialogHeader className="text-center sm:text-center">
          <div className="flex justify-center mb-4">
            <span className="material-symbols-outlined text-5xl text-[#1a1a1a]">
              filter_vintage
            </span>
          </div>
          <DialogTitle className="font-serif text-2xl text-[#1a1a1a]">
            {tAuth("welcomeDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-[#6b7280]">
            {tAuth("welcomeDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={() => handleNavigation("/signin")}
            className="w-full bg-[#1a1a1a] hover:bg-[#2d3436] text-white py-6"
          >
            <span className="material-symbols-outlined mr-2">mail</span>
            {tAuth("signInWithEmail")}
          </Button>
          <Button
            onClick={() => handleNavigation("/signup")}
            variant="outline"
            className="w-full border-[#e5e5e1] hover:bg-[#faf9f6] text-[#1a1a1a] py-6"
          >
            <span className="material-symbols-outlined mr-2">person_add</span>
            {tSignup("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
