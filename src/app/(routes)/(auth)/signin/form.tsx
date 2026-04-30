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
import { signIn } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SignInSchema, SignInValues } from "./validate";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

export default function SignInForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations('auth.signin');
  const tErrors = useTranslations('auth.errors');

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: SignInValues) {
    startTransition(async () => {
      const response = await signIn.username(data);

      if (response.error) {
        console.log("SIGN_IN:", response.error.message, response.error.code);
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

  const getInputClassName = (fieldName: keyof SignInValues) =>
    cn(
      form.formState.errors[fieldName] &&
        "border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20",
    );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={t("usernamePlaceholder")}
                  className={cn(
                    "h-16 rounded-full border-[#7a8db7] px-7 text-[18px] shadow-none focus-visible:border-[#4d6fb6] focus-visible:ring-[#4d6fb6]/20 md:text-[18px]",
                    getInputClassName("username")
                  )}
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
                  <Input
                    id="input-23"
                    className={cn(
                      "h-16 rounded-full border-[#d9d9d9] px-7 pe-12 text-[18px] shadow-none focus-visible:border-[#4d6fb6] focus-visible:ring-[#4d6fb6]/20 md:text-[18px]",
                      getInputClassName("password")
                    )}
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
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[#6b7280] transition-colors hover:text-[#0d0d0d]"
          >
            {t("forgotPassword")}
          </Link>
        </div>
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
        <p className="text-center text-sm text-[#5f5f5f]">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-[#0d0d0d] underline-offset-4 hover:underline">
            {t("signupLink")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
