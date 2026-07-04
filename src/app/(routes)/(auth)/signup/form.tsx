"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SignUpSchema, SignUpValues } from "./validate";
import InputPasswordContainer from "../components/input-password";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthFloatingInput } from "../components/auth-floating-input";

export default function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [emailSent, setEmailSent] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const t = useTranslations("auth.signup");
  const tErrors = useTranslations("auth.errors");
  const tVerify = useTranslations("auth.emailVerification");

  const form = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      gender: false,
    },
  });

  const username = useWatch({
    control: form.control,
    name: "username",
  });

  useEffect(() => {
    const currentName = form.getValues("name");
    if (currentName !== username) {
      form.setValue("name", username || "");
    }
  }, [form, username]);

  function onSubmit(data: SignUpValues) {
    startTransition(async () => {
      // Clean up unverified accounts with same email/username
      await fetch("/api/auth/cleanup-unverified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, username: data.username }),
      });

      const response = await signUp.email(data);

      if (response.error) {
        const msg = response.error.message ?? "";
        const code = response.error.code ?? "";
        let errorKey = "unknown";
        if (msg === "User already exists" || code === "USER_ALREADY_EXISTS") {
          errorKey = "userExists";
        } else if (msg.includes("email") && msg.includes("already")) {
          errorKey = "emailExists";
        } else if (msg.includes("username") && msg.includes("already")) {
          errorKey = "usernameExists";
        } else if (code === "TOO_MANY_REQUESTS" || response.error.status === 429) {
          errorKey = "tooManyRequests";
        } else if (msg.includes("password") && msg.includes("short")) {
          errorKey = "passwordTooShort";
        }
        toast.error(tErrors(errorKey, { message: msg }));
      } else {
        setEmailSent(true);
      }
    });
  }

  const handleContinue = async () => {
    const isEmailValid = await form.trigger("email");
    if (isEmailValid) {
      setEmailConfirmed(true);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-4 py-4 text-center text-white">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white">
          <MailCheck className="size-7" strokeWidth={1.9} />
        </div>
        <h3 className="text-[22px] font-normal text-white">{tVerify('checkEmail')}</h3>
        <p className="text-sm leading-6 text-[#cdd5e0]">{tVerify('checkEmailDesc')}</p>
        <Link
          href="/signin"
          className="inline-block text-sm font-medium text-[#a6baff] underline-offset-4 hover:underline"
        >
          {t('signinLink')}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3"
      >
        {!emailConfirmed ? (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthFloatingInput
                      label={t('emailPlaceholder')}
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
              <span className="truncate">{form.getValues("email")}</span>
              <button
                type="button"
                onClick={() => setEmailConfirmed(false)}
                className="shrink-0 font-medium text-[#a6baff] hover:underline"
              >
                编辑
              </button>
            </div>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthFloatingInput
                      label={t('usernamePlaceholder')}
                      autoComplete="username"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <InputPasswordContainer>
                      <AuthFloatingInput
                        label={t('passwordPlaceholder')}
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
                        label={t('confirmPasswordPlaceholder')}
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
              className="mt-1 h-[52px] w-full rounded-full bg-[#f9f9f9] text-[16px] font-normal text-[#0c1020] hover:bg-white disabled:bg-white/50 disabled:text-[#0c1020]/70"
            >
              {isPending ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                t('submit')
              )}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
