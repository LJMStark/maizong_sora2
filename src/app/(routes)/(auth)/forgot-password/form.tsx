"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ForgotPasswordSchema, ForgotPasswordValues } from "./validate";
import InputStartIcon from "../components/input-start-icon";
import { cn } from "@/lib/utils";
import { MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const t = useTranslations("auth.forgotPassword");
  const tErrors = useTranslations("auth.errors");

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: ForgotPasswordValues) {
    startTransition(async () => {
      const response = await requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (response.error) {
        console.log("FORGOT_PASSWORD:", response.error.message, response.error.code);
        const msg = response.error.message ?? "";
        const code = response.error.code ?? "";
        let errorKey = "unknown";
        if (msg.includes("User not found") || code === "USER_NOT_FOUND") {
          errorKey = "userNotFound";
        } else if (code === "TOO_MANY_REQUESTS" || response.error.status === 429) {
          errorKey = "tooManyRequests";
        } else if (msg.includes("send") || msg.includes("email")) {
          errorKey = "sendEmailFailed";
        }
        toast.error(tErrors(errorKey, { message: msg }));
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-[#8C7355]">mark_email_read</span>
        <p className="text-[#4b5563]">{t("success")}</p>
        <Link
          href="/signin"
          className="inline-block text-sm font-semibold text-[#1a1a1a] hover:text-[#8C7355] transition-colors"
        >
          {t("backToSignin")}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputStartIcon icon={MailIcon}>
                  <Input
                    placeholder={t("emailPlaceholder")}
                    className={cn(
                      "peer ps-9",
                      form.formState.errors.email &&
                        "border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20"
                    )}
                    disabled={isPending}
                    {...field}
                  />
                </InputStartIcon>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="mt-4 w-full bg-[#1a1a1a] hover:bg-[#2d3436] text-white py-5"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          ) : (
            t("submit")
          )}
        </Button>
        <div className="text-center">
          <Link
            href="/signin"
            className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
          >
            {t("backToSignin")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
