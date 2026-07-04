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
import { toast } from "sonner";
import { ForgotPasswordSchema, ForgotPasswordValues } from "./validate";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthFloatingInput } from "../components/auth-floating-input";

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
      <div className="space-y-4 text-center text-white">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white">
          <MailCheck className="size-7" strokeWidth={1.9} />
        </div>
        <p className="text-sm leading-6 text-[#cdd5e0]">{t("success")}</p>
        <Link
          href="/signin"
          className="inline-block text-sm font-medium text-[#a6baff] underline-offset-4 hover:underline"
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
                <AuthFloatingInput
                  label={t("emailPlaceholder")}
                  autoComplete="email"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="mt-2 h-[52px] w-full rounded-full bg-[#f9f9f9] text-[16px] font-normal text-[#0c1020] hover:bg-white disabled:bg-white/50 disabled:text-[#0c1020]/70"
        >
          {isPending ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            t("submit")
          )}
        </Button>
        <div className="text-center">
          <Link
            href="/signin"
            className="text-sm text-[#cdd5e0] transition-colors hover:text-white"
          >
            {t("backToSignin")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
