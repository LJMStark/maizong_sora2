"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Brain,
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
  | typeof FlaskConical;

interface Plan {
  name: string;
  description: string;
  button: string;
  highlighted?: boolean;
  badge?: string;
  packageIndex?: number;
  features: Array<{ icon: FeatureIcon; text: string }>;
}

const PLANS: Plan[] = [
  {
    name: "小象体验卡",
    description: "适合先试完整创作流程",
    button: "购买体验卡",
    packageIndex: 0,
    features: [
      { icon: Sparkles, text: "体验多模型图像生成" },
      { icon: Video, text: "试用 AI 视频生成" },
      { icon: ImageIcon, text: "保存生成后的作品" },
      { icon: Brain, text: "尝试不同提示词模板" },
    ],
  },
  {
    name: "小象月卡",
    description: "适合持续产出日常素材",
    button: "购买月卡",
    packageIndex: 1,
    features: [
      { icon: Sparkles, text: "每月发放初始积分" },
      { icon: MessageCircle, text: "每日积分自动到账" },
      { icon: ImageIcon, text: "生成商品图、封面和海报" },
      { icon: Bot, text: "按场景选择不同模型" },
      { icon: Workflow, text: "作品和任务统一管理" },
      { icon: Video, text: "覆盖常规短视频创作" },
    ],
  },
  {
    name: "小象专业卡",
    description: "适合高频图像和视频制作",
    button: "购买专业月卡",
    highlighted: true,
    badge: "热门",
    packageIndex: 2,
    features: [
      { icon: Sparkles, text: "更高的月度初始积分" },
      { icon: ImageIcon, text: "适合批量生成产品视觉" },
      { icon: Video, text: "支持更多 AI 视频任务" },
      { icon: MessageCircle, text: "保存常用提示词方案" },
      { icon: Workflow, text: "适合电商上新和内容排期" },
      { icon: Bot, text: "减少临时补积分的次数" },
    ],
  },
  {
    name: "小象年卡",
    description: "适合长期稳定使用",
    button: "购买年卡",
    packageIndex: 3,
    features: [
      { icon: Sparkles, text: "年度使用成本更可控" },
      { icon: MessageCircle, text: "每日积分覆盖长期创作" },
      { icon: ImageIcon, text: "适合团队素材生产" },
      { icon: Video, text: "覆盖连续视频制作需求" },
      { icon: FlaskConical, text: "适合深度测试模型和风格" },
    ],
  },
];

function formatYuan(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace(/\.00$/, "");
}

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
  packageInfo,
  loading,
  onPurchase,
}: {
  plan: Plan;
  packageInfo: Package | null;
  loading: boolean;
  onPurchase: () => void;
}) {
  if (loading) return <PackageSkeleton />;

  const displayName = plan.name;
  const price = packageInfo ? formatYuan(packageInfo.price) : "--";
  let period = "一次购买";
  if (packageInfo?.type === "subscription") {
    period = (packageInfo.durationDays ?? 0) >= 365 ? "/年" : "/期";
  }

  let creditText: string | null = null;
  if (packageInfo?.type === "subscription") {
    creditText = `月初始 ${packageInfo.credits ?? 0} 积分，每日 ${packageInfo.dailyCredits ?? 0} 积分`;
  } else if (packageInfo?.credits) {
    creditText = `${packageInfo.credits} 积分`;
  }

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
          {displayName}
        </h2>
        {plan.badge && (
          <span className="rounded-full bg-[#e5e0ff] px-4 py-2 text-[13px] font-semibold tracking-normal text-[#6254d9]">
            {plan.badge}
          </span>
        )}
      </div>

      <div className="mb-7 flex items-start gap-1">
        <span className="mt-2 text-[28px] leading-none text-[#999]">¥</span>
        <span className="text-[58px] font-normal leading-none text-[#0d0d0d]">
          {price}
        </span>
        <span className="mt-5 text-[16px] leading-5 text-[#606060]">{period}</span>
      </div>

      <p className="mb-3 text-[22px] font-medium leading-7 text-[#111]">
        {plan.description}
      </p>
      {creditText && (
        <p className="mb-9 text-[16px] leading-6 text-[#606060]">{creditText}</p>
      )}

      <button
        type="button"
        onClick={onPurchase}
        disabled={!packageInfo}
        className={cn(
          "mb-9 flex h-[54px] w-full items-center justify-center rounded-full text-[18px] font-medium transition",
          !packageInfo
            ? "border border-[#e5e5e5] bg-white text-[#777]"
            : plan.highlighted
              ? "bg-[#615ced] text-white hover:bg-[#514be5]"
              : "bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
        )}
      >
        {packageInfo ? plan.button : "暂未配置"}
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

  const subscriptionPackages = packages.filter((p) => p.type === "subscription");
  const creditPackages = packages.filter((p) => p.type === "package");

  const purchaseSource = subscriptionPackages.length > 0 ? subscriptionPackages : creditPackages;
  const purchasePackages = [
    purchaseSource[0] ?? null,
    purchaseSource[1] ?? purchaseSource[0] ?? null,
    purchaseSource[2] ?? purchaseSource[purchaseSource.length - 1] ?? null,
    purchaseSource[3] ?? purchaseSource[purchaseSource.length - 1] ?? null,
  ];

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
          选择小象万象套餐
        </h1>

        <div className="mx-auto mt-8 flex rounded-full bg-[#f0f0f0] p-1">
          {["个人创作", "团队采购"].map((label, index) => (
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
                packageInfo={pkg}
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
