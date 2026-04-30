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
import { LoaderCircle, MailCheck, MailIcon } from "lucide-react";
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
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#f0f0f0] text-[#0d0d0d]">
          <MailCheck className="size-7" strokeWidth={1.9} />
        </div>
        <p className="text-sm leading-6 text-[#5f5f5f]">{t("success")}</p>
        <Link
          href="/signin"
          className="inline-block text-sm font-medium text-[#0d0d0d] underline-offset-4 hover:underline"
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
                      "peer h-16 rounded-full border-[#d9d9d9] px-7 ps-12 text-[18px] shadow-none focus-visible:border-[#4d6fb6] focus-visible:ring-[#4d6fb6]/20 md:text-[18px]",
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
          className="mt-2 h-16 w-full rounded-full bg-[#0d0d0d] text-[18px] font-normal text-white hover:bg-[#2a2a2a]"
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
            className="text-sm text-[#6b7280] hover:text-[#1a1a1a] transition-colors"
          >
            {t("backToSignin")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
