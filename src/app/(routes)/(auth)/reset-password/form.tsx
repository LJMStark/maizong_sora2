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
import { toast } from "sonner";
import { ResetPasswordSchema, ResetPasswordValues } from "./validate";
import InputPasswordContainer from "../components/input-password";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { AuthFloatingInput } from "../components/auth-floating-input";

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

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-200">{t("invalidToken")}</p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-[#a6baff] underline-offset-4 hover:underline"
        >
          {t("requestNewLink")}
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
                  <AuthFloatingInput
                    label={t("passwordPlaceholder")}
                    autoComplete="new-password"
                    className="pe-12"
                    labelEnd="action"
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
                  <AuthFloatingInput
                    label={t("confirmPasswordPlaceholder")}
                    autoComplete="new-password"
                    className="pe-12"
                    labelEnd="action"
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
          className="mt-2 h-[52px] w-full rounded-full bg-[#f9f9f9] text-[16px] font-normal text-[#0c1020] hover:bg-white disabled:bg-white/50 disabled:text-[#0c1020]/70"
        >
          {isPending ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </Form>
  );
}
