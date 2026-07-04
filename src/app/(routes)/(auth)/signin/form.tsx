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
import { signIn } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SignInSchema, SignInValues } from "./validate";
import InputPasswordContainer from "../components/input-password";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { AuthFloatingInput } from "../components/auth-floating-input";

export default function SignInForm({
  initialUsername = "",
}: {
  initialUsername?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [credentialConfirmed, setCredentialConfirmed] = useState(Boolean(initialUsername));
  const router = useRouter();
  const t = useTranslations('auth.signin');
  const tErrors = useTranslations('auth.errors');

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      username: initialUsername,
      password: "",
    },
  });

  function onSubmit(data: SignInValues) {
    startTransition(async () => {
      const response = await signIn.username(data);

      if (response.error) {
        const msg = response.error.message ?? "";
        const code = response.error.code ?? "";
        let errorKey = "unknown";
        if (msg.includes("Invalid") && (msg.includes("password") || msg.includes("credentials"))) {
          errorKey = "invalidCredentials";
        } else if (code === "INVALID_EMAIL_OR_PASSWORD") {
          errorKey = "invalidCredentials";
        } else if (msg.includes("email is not verified") || code === "EMAIL_NOT_VERIFIED") {
          errorKey = "emailNotVerified";
        } else if (code === "TOO_MANY_REQUESTS" || response.error.status === 429) {
          errorKey = "tooManyRequests";
        } else if (msg.includes("User not found")) {
          errorKey = "userNotFound";
        }
        toast.error(tErrors(errorKey, { message: msg }));
      } else {
        router.push("/");
      }
    });
  }

  const handleContinue = async () => {
    const isUsernameValid = await form.trigger("username");
    if (isUsernameValid) {
      setCredentialConfirmed(true);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3"
      >
        {!credentialConfirmed ? (
          <>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthFloatingInput
                      label={t("usernamePlaceholder")}
                      autoComplete="username"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void handleContinue()}
              className="mt-1 h-[52px] w-full rounded-full bg-[#f9f9f9] text-[16px] font-normal text-[#0c1020] hover:bg-white disabled:bg-white/50 disabled:text-[#0c1020]/70"
            >
              继续
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-[#eef2ff]">
              <span className="truncate">{form.getValues("username")}</span>
              <button
                type="button"
                onClick={() => setCredentialConfirmed(false)}
                className="shrink-0 font-medium text-[#a6baff] hover:underline"
              >
                编辑
              </button>
            </div>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <InputPasswordContainer>
                      <AuthFloatingInput
                        label={t("passwordPlaceholder")}
                        autoComplete="current-password"
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
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[#cdd5e0] transition-colors hover:text-white"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="mt-1 h-[52px] w-full rounded-full bg-[#f9f9f9] text-[16px] font-normal text-[#0c1020] hover:bg-white disabled:bg-white/50 disabled:text-[#0c1020]/70"
            >
              {isPending ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                t("submit")
              )}
            </Button>
          </>
        )}
        <p className="text-center text-sm text-[#eef2ff]">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-[#a6baff] underline-offset-4 hover:underline">
            {t("signupLink")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
