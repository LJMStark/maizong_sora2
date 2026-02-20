"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp } from "@/lib/auth/client";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SignUpSchema, SignUpValues } from "./validate";
import InputStartIcon from "../components/input-start-icon";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { AtSign, MailIcon } from "lucide-react";
import { GenderRadioGroup } from "../components/gender-radio-group";
import { useTranslations } from 'next-intl';
import Link from "next/link";

export default function SignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [emailSent, setEmailSent] = useState(false);
  const t = useTranslations('auth.signup');
  const tErrors = useTranslations('auth.errors');
  const tVerify = useTranslations('auth.emailVerification');

  const form = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      gender: false
    },
  });

  const username = form.watch("username");

  useEffect(() => {
    const currentName = form.getValues("name");
    if (currentName !== username) {
      form.setValue("name", username || "");
    }
  }, [form, username]);

  function onSubmit(data: SignUpValues) {
    startTransition(async () => {
      console.log("submit data:", data);

      // Clean up unverified accounts with same email/username
      await fetch("/api/auth/cleanup-unverified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, username: data.username }),
      });

      const response = await signUp.email(data);

      if (response.error) {
        console.log("SIGN_UP:", response.error.message, response.error.code);
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

  const getInputClassName = (fieldName: keyof SignUpValues) =>
    cn(
      form.formState.errors[fieldName] &&
        "border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20",
    );

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <span className="material-symbols-outlined text-4xl text-[#8C7355]">mark_email_read</span>
        <h3 className="text-lg font-semibold text-[#1a1a1a]">{tVerify('checkEmail')}</h3>
        <p className="text-[#4b5563] text-sm">{tVerify('checkEmailDesc')}</p>
        <Link
          href="/signin"
          className="inline-block text-sm font-semibold text-[#1a1a1a] hover:text-[#8C7355] transition-colors"
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
                    placeholder={t('emailPlaceholder')}
                    className={cn("peer ps-9", getInputClassName("email"))}
                    disabled={isPending}
                    {...field}
                  />
                </InputStartIcon>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputStartIcon icon={AtSign}>
                  <Input
                    placeholder={t('usernamePlaceholder')}
                    className={cn("peer ps-9", getInputClassName("username"))}
                    disabled={isPending}
                    {...field}
                  />
                </InputStartIcon>
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
                  <Input
                    className={cn("pe-9", getInputClassName("password"))}
                    placeholder={t('passwordPlaceholder')}
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
                    placeholder={t('confirmPasswordPlaceholder')}
                    disabled={isPending}
                    {...field}
                  />
                </InputPasswordContainer>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('gender')}</FormLabel>
              <GenderRadioGroup
                value={field.value}
                onChange={field.onChange}
              />
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
            t('submit')
          )}
        </Button>
      </form>
    </Form>
  );
}
