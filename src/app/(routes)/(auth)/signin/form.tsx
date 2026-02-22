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
import InputStartIcon from "../components/input-start-icon";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { AtSign } from "lucide-react";
import { useTranslations } from 'next-intl';
import Link from "next/link";

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
                    id="input-23"
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
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[#6b7280] hover:text-[#8C7355] transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>
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
