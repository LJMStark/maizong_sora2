"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/lib/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ResetPasswordSchema, ResetPasswordValues } from "./validate";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const t = useTranslations("auth.resetPassword");
  const tErrors = useTranslations("auth.errors");

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(data: ResetPasswordValues) {
    startTransition(async () => {
      const response = await resetPassword({
        newPassword: data.password,
        token,
      });

      if (response.error) {
        console.log("RESET_PASSWORD:", response.error.message, response.error.code);
        const msg = response.error.message ?? "";
        const code = response.error.code ?? "";
        let errorKey = "unknown";
        if (msg.includes("INVALID") || msg.includes("expired") || code === "INVALID_TOKEN") {
          errorKey = "invalidToken";
        } else if (code === "TOO_MANY_REQUESTS" || response.error.status === 429) {
          errorKey = "tooManyRequests";
        } else if (msg.includes("password") && msg.includes("short")) {
          errorKey = "passwordTooShort";
        }
        toast.error(tErrors(errorKey, { message: msg }));
      } else {
        toast.success(t("success"));
        router.push("/signin");
      }
    });
  }

  const getInputClassName = (fieldName: keyof ResetPasswordValues) =>
    cn(
      form.formState.errors[fieldName] &&
        "border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20"
    );

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-[#ef4444]">{t("invalidToken")}</p>
        <Link
          href="/forgot-password"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputPasswordContainer>
                  <Input
                    className={cn("pe-9", getInputClassName("password"))}
                    placeholder={t("passwordPlaceholder")}
                    disabled={isPending}
                    {...field}
                  />
                </InputPasswordContainer>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputPasswordContainer>
                  <Input
                    className={cn("pe-9", getInputClassName("confirmPassword"))}
                    placeholder={t("confirmPasswordPlaceholder")}
                    disabled={isPending}
                    {...field}
                  />
                </InputPasswordContainer>
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
      </form>
    </Form>
  );
}
