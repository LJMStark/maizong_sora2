"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Brain,
  Code2,
  FlaskConical,
  ImageIcon,
  MessageCircle,
  Sparkles,
  Video,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CreditPurchaseDialog } from "./credit-purchase-dialog";
import { useSession } from "@/lib/auth/client";
import { LoginDialog } from "./shared/login-dialog";
import { cn } from "@/lib/utils";

interface Package {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits: number | null;
  dailyCredits: number | null;
  durationDays: number | null;
  price: number;
}

type FeatureIcon =
  | typeof Sparkles
  | typeof MessageCircle
  | typeof ImageIcon
  | typeof Brain
  | typeof Bot
  | typeof Workflow
  | typeof Video
  | typeof Code2
  | typeof FlaskConical;

interface Plan {
  name: string;
  price: string;
  description: string;
  button: string;
  current?: boolean;
  highlighted?: boolean;
  badge?: string;
  packageIndex?: number;
  features: Array<{ icon: FeatureIcon; text: string }>;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "0",
    description: "See what AI can do",
    button: "Your current plan",
    current: true,
    features: [
      { icon: Sparkles, text: "Get simple explanations" },
      { icon: MessageCircle, text: "Have short chats for common questions" },
      { icon: ImageIcon, text: "Try out image generation" },
      { icon: Brain, text: "Save limited memory and context" },
    ],
  },
  {
    name: "Go",
    price: "8",
    description: "Keep chatting with expanded access",
    button: "Upgrade to Go",
    packageIndex: 0,
    features: [
      { icon: Sparkles, text: "Explore topics in depth" },
      { icon: MessageCircle, text: "Chat longer and upload more content" },
      { icon: ImageIcon, text: "Make more images for your projects" },
      { icon: Brain, text: "Get more memory for smarter replies" },
      { icon: Workflow, text: "Get help with planning and tasks" },
      { icon: Bot, text: "Explore projects, tasks, and custom GPTs" },
    ],
  },
  {
    name: "Plus",
    price: "20",
    description: "Unlock the full experience",
    button: "Upgrade to Plus",
    highlighted: true,
    badge: "POPULAR",
    packageIndex: 1,
    features: [
      { icon: Sparkles, text: "Solve complex problems" },
      { icon: MessageCircle, text: "Have long chats over multiple sessions" },
      { icon: ImageIcon, text: "Create more images, faster" },
      { icon: Brain, text: "Remember goals and past conversations" },
      { icon: Workflow, text: "Plan travel and tasks with agent mode" },
      { icon: Bot, text: "Organize projects and customize GPTs" },
      { icon: Video, text: "Produce and share videos on Sora" },
      { icon: Code2, text: "Write code and build apps with Codex" },
    ],
  },
  {
    name: "Pro",
    price: "200",
    description: "Maximize your productivity",
    button: "Upgrade to Pro",
    packageIndex: 2,
    features: [
      { icon: Sparkles, text: "Master advanced tasks and topics" },
      { icon: MessageCircle, text: "Tackle big projects with unlimited GPT-5.2" },
      { icon: ImageIcon, text: "Create high-quality images at any scale" },
      { icon: Brain, text: "Keep full context with maximum memory" },
      { icon: Workflow, text: "Run research and plan tasks with agents" },
      { icon: Bot, text: "Scale your projects and automate workflows" },
      { icon: Video, text: "Expand your limits with Sora video creation" },
      { icon: Code2, text: "Deploy code faster with Codex" },
      { icon: FlaskConical, text: "Get early access to experimental features" },
    ],
  },
];

function PackageSkeleton() {
  return (
    <div className="h-[720px] animate-pulse rounded-[18px] border border-[#e5e5e5] bg-white p-8">
      <div className="mb-8 h-10 w-28 rounded bg-[#eeeeee]" />
      <div className="mb-8 h-14 w-40 rounded bg-[#eeeeee]" />
      <div className="mb-12 h-12 w-full rounded-full bg-[#eeeeee]" />
      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-5 rounded bg-[#eeeeee]" />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  loading,
  onPurchase,
}: {
  plan: Plan;
  loading: boolean;
  onPurchase: () => void;
}) {
  if (loading) return <PackageSkeleton />;

  return (
    <article
      className={cn(
        "relative flex min-h-[720px] flex-col rounded-[18px] border bg-white px-8 py-9",
        plan.highlighted
          ? "border-[#6458f5] bg-[#f4f3ff]"
          : "border-[#e0e0e0]"
      )}
    >
      <div className="mb-9 flex items-start justify-between">
        <h2 className="text-[54px] font-medium leading-none tracking-normal text-[#0d0d0d]">
          {plan.name}
        </h2>
        {plan.badge && (
          <span className="rounded-full bg-[#e5e0ff] px-4 py-2 text-[13px] font-semibold tracking-[0.12em] text-[#6254d9]">
            {plan.badge}
          </span>
        )}
      </div>

      <div className="mb-7 flex items-start gap-1">
        <span className="mt-2 text-[28px] leading-none text-[#999]">$</span>
        <span className="text-[58px] font-normal leading-none text-[#0d0d0d]">
          {plan.price}
        </span>
        <span className="mt-5 text-[16px] leading-5 text-[#606060]">
          USD /<br />
          month
        </span>
      </div>

      <p className="mb-12 text-[22px] font-medium leading-7 text-[#111]">
        {plan.description}
      </p>

      <button
        type="button"
        onClick={onPurchase}
        disabled={plan.current}
        className={cn(
          "mb-9 flex h-[54px] w-full items-center justify-center rounded-full text-[18px] font-medium transition",
          plan.current
            ? "border border-[#e5e5e5] bg-white text-[#777]"
            : plan.highlighted
              ? "bg-[#615ced] text-white hover:bg-[#514be5]"
              : "bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
        )}
      >
        {plan.button}
      </button>

      <ul className="flex flex-col gap-6">
        {plan.features.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.text} className="flex gap-5 text-[18px] leading-7 text-[#111]">
              <Icon className="mt-1 size-5 shrink-0" strokeWidth={1.9} />
              <span>{feature.text}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

const Subscription: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/packages");
        const data = await res.json();
        if (data.packages) {
          setPackages(data.packages);
        }
      } catch (error) {
        console.error("Failed to fetch packages:", error);
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`加载套餐失败：${message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  const subscriptionPackages = useMemo(
    () => packages.filter((p) => p.type === "subscription"),
    [packages]
  );
  const creditPackages = useMemo(
    () => packages.filter((p) => p.type === "package"),
    [packages]
  );

  const purchasePackages = useMemo(() => {
    const source = subscriptionPackages.length > 0 ? subscriptionPackages : creditPackages;
    return [
      source[0] ?? null,
      source[1] ?? source[0] ?? null,
      source[2] ?? source[source.length - 1] ?? null,
    ];
  }, [creditPackages, subscriptionPackages]);

  const handlePurchase = (pkg: Package | null) => {
    if (!pkg) {
      toast.error("套餐暂未配置，请稍后再试");
      return;
    }

    if (isPending) {
      toast.error("正在验证登录状态，请稍后重试");
      return;
    }

    if (!session?.user) {
      setLoginDialogOpen(true);
      return;
    }

    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-white font-sans text-[#0d0d0d]">
      <Link
        href="/studio"
        className="fixed right-9 top-9 z-10 flex size-10 items-center justify-center rounded-full text-[#777] hover:bg-black/5"
        aria-label="Close"
      >
        <X className="size-7" strokeWidth={1.8} />
      </Link>

      <div className="mx-auto flex w-full max-w-[1880px] flex-col px-5 pb-24 pt-[95px]">
        <h1 className="text-center text-[36px] font-normal leading-tight">
          Upgrade your plan
        </h1>

        <div className="mx-auto mt-8 flex rounded-full bg-[#f0f0f0] p-1">
          {["Personal", "Business"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "h-11 rounded-full px-5 text-[18px] transition",
                selectedIndex === index
                  ? "bg-white text-[#0d0d0d] shadow-sm"
                  : "text-[#8a8a8a]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const pkg =
              typeof plan.packageIndex === "number"
                ? purchasePackages[plan.packageIndex]
                : null;
            return (
              <PlanCard
                key={plan.name}
                plan={plan}
                loading={loading}
                onPurchase={() => handlePurchase(pkg)}
              />
            );
          })}
        </div>
      </div>

      <CreditPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedPackage={selectedPackage}
        onUnauthorized={() => {
          setDialogOpen(false);
          setLoginDialogOpen(true);
        }}
      />
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
};

export default Subscription;
