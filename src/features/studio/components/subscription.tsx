"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  ImageIcon,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CreditPurchaseDialog } from "./credit-purchase-dialog";
import { BusinessContactDialog } from "./business-contact-dialog";
import { useSession } from "@/lib/auth/client";
import { LoginDialog } from "./shared/login-dialog";
import { cn } from "@/lib/utils";
import { centsToYuan } from "@/lib/format";
import { APP_BRAND } from "@/lib/brand";
import { DEFAULT_CREDIT_PACKAGES } from "../data/default-credit-packages";

type BillingTab = "personal" | "business";

interface Package {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits: number | null;
  dailyCredits: number | null;
  durationDays: number | null;
  price: number;
}

interface Plan {
  name: string;
  description: string;
  button: string;
  fallbackPackage: Package;
  highlighted?: boolean;
  badge?: string;
  tagline: string;
  includedLabel: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "小象体验卡",
    description: "适合试完整创作流程",
    button: "购买体验卡",
    fallbackPackage: DEFAULT_CREDIT_PACKAGES[0],
    tagline: "看看 AI 创作能做什么",
    includedLabel: "包含基础能力：",
    features: [
      "体验图像和视频生成",
      "保存生成后的作品",
      "试用提示词模板",
      "适合短期评估",
    ],
  },
  {
    name: "小象月卡",
    description: "适合日常素材产出",
    button: "购买月卡",
    fallbackPackage: DEFAULT_CREDIT_PACKAGES[1],
    tagline: "更长时间持续生成素材",
    includedLabel: "体验卡能力外加：",
    features: [
      "每月发放初始积分",
      "每日积分自动到账",
      "覆盖商品图、封面和海报",
      "常规短视频创作",
      "作品和任务统一管理",
    ],
  },
  {
    name: "小象专业卡",
    description: "适合高频图像和视频制作",
    button: "购买专业月卡",
    highlighted: true,
    badge: "推荐",
    fallbackPackage: DEFAULT_CREDIT_PACKAGES[2],
    tagline: "解锁完整图像和视频体验",
    includedLabel: "月卡能力外加：",
    features: [
      "更高月度初始积分",
      "适合批量产品视觉",
      "支持更多视频任务",
      "保存常用提示词方案",
      "适合电商上新和内容排期",
    ],
  },
  {
    name: "小象年卡",
    description: "适合长期稳定使用",
    button: "购买年卡",
    fallbackPackage: DEFAULT_CREDIT_PACKAGES[3],
    tagline: "最大化长期内容产出",
    includedLabel: "专业卡能力外加：",
    features: [
      "年度成本更可控",
      "每日积分覆盖长期创作",
      "适合团队素材生产",
      "支持连续视频制作",
      "适合深度测试模型和风格",
    ],
  },
];

const BUSINESS_PLANS = [
  {
    name: "团队采购",
    subtitle: "多人创作额度和统一开通",
    description: "适合需要多人账号、发票和批量开通的内容团队。",
    price: "人工确认",
    button: "联系管理员",
    includedLabel: "包含：",
    features: ["多人账号开通", "统一额度管理", "订单和发票处理", "按成员分配创作额度"],
  },
  {
    name: "内容团队",
    subtitle: "固定素材生产的团队额度",
    description: "适合电商上新、直播切片和日常素材排期。",
    price: "按月配置",
    button: "申请开通",
    includedLabel: "包含：",
    features: ["批量创作额度", "统一订单确认", "按阶段补充积分", "图像和视频用量规划"],
  },
  {
    name: "企业方案",
    subtitle: "长期内容团队的定制额度",
    description: "适合持续上新、固定团队和长期任务用量管理。",
    price: "定制价格",
    button: "咨询方案",
    includedLabel: "包含：",
    features: ["长期额度安排", "管理员确认开通", "订单和发票处理", "用量和任务建议"],
  },
];

const PERSONAL_COMPARE_ROWS = [
  {
    feature: "图像生成",
    values: ["试用", "日常", "高频", "长期"],
  },
  {
    feature: "视频生成",
    values: ["少量", "常规", "更多", "连续"],
  },
  {
    feature: "积分发放",
    values: ["3 天", "30 天", "30 天", "365 天"],
  },
  {
    feature: "失败任务退回",
    values: ["支持", "支持", "支持", "支持"],
  },
  {
    feature: "订单处理",
    values: ["人工确认", "人工确认", "人工确认", "人工确认"],
  },
];

const BUSINESS_COMPARE_ROWS = [
  {
    feature: "账号开通",
    values: ["多人", "多人", "定制"],
  },
  {
    feature: "额度安排",
    values: ["统一额度", "按月配置", "长期定制"],
  },
  {
    feature: "订单处理",
    values: ["人工确认", "人工确认", "人工确认"],
  },
  {
    feature: "发票支持",
    values: ["支持", "支持", "支持"],
  },
  {
    feature: "用量建议",
    values: ["基础", "阶段规划", "长期规划"],
  },
];

function getPlanPackage(plan: Plan, packages: Package[]): Package {
  return (
    packages.find((pkg) => pkg.name === plan.name) ??
    packages.find((pkg) => pkg.id === plan.fallbackPackage.id) ??
    plan.fallbackPackage
  );
}

function getPlanPeriod(packageInfo: Package | null) {
  if (!packageInfo) return "";
  if (packageInfo.type !== "subscription") return "一次购买";

  return (packageInfo.durationDays ?? 0) >= 365 ? "/ 年" : "/ 月";
}

function getCreditSummary(packageInfo: Package | null) {
  if (!packageInfo) return "等待上架";

  if (packageInfo.type === "subscription") {
    return `初始 ${packageInfo.credits ?? 0} 积分，每日 ${packageInfo.dailyCredits ?? 0} 积分`;
  }

  return `${packageInfo.credits ?? 0} 积分`;
}

function PackageSkeleton() {
  return (
    <div className="min-h-[520px] animate-pulse rounded-[16px] border border-[#e5e5e5] bg-white p-5">
      <div className="h-7 w-28 rounded bg-[#eeeeee]" />
      <div className="mt-5 h-10 w-36 rounded bg-[#eeeeee]" />
      <div className="mt-6 h-9 rounded-full bg-[#eeeeee]" />
      <div className="mt-7 space-y-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-4 rounded bg-[#eeeeee]" />
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

  const price = packageInfo
    ? centsToYuan(packageInfo.price, { trimZeroFen: true })
    : "--";
  const period = getPlanPeriod(packageInfo);

  return (
    <article
      className={cn(
        "relative flex min-h-[520px] flex-col rounded-[16px] border p-5 transition",
        plan.highlighted
          ? "border-[#d8d2ff] bg-[#f8f7ff]"
          : "border-[#e5e5e5] bg-white"
      )}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <h2 className="text-[28px] font-medium leading-[1.14] text-[#0d0d0d] md:text-[29px]">
            {plan.name}
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-6 text-[#222]">
            {plan.tagline}
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-[#666]">
            {plan.description}
          </p>
        </div>
        {plan.badge && (
          <span className="absolute right-5 top-5 rounded-full bg-[#ece8ff] px-2.5 py-1 text-[11px] font-medium text-[#665cf2]">
            {plan.badge}
          </span>
        )}
      </div>

      <div className="mt-7 flex items-end gap-1">
        <span className="mb-2 text-[17px] leading-none text-[#8a8a8a]">
          ¥
        </span>
        <span className="text-[44px] font-medium leading-none text-[#0d0d0d] md:text-[46px]">
          {price}
        </span>
        <span className="mb-2 text-xs leading-5 text-[#555]">{period}</span>
      </div>
      <p className="mt-2 min-h-5 text-xs leading-5 text-[#666]">
        {getCreditSummary(packageInfo)}
      </p>

      <button
        type="button"
        onClick={onPurchase}
        disabled={!packageInfo}
        className={cn(
          "mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition",
          packageInfo
            ? plan.highlighted
              ? "bg-[#6b5cff] text-white hover:bg-[#5c52dc]"
              : "bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            : "border border-[#e5e5e5] bg-white text-[#777]"
        )}
      >
        {packageInfo ? plan.button : "等待上架"}
        {packageInfo && <ChevronRight className="size-4" strokeWidth={1.9} />}
      </button>

      <div className="mt-6">
        <p className="text-sm font-medium text-[#0d0d0d]">
          {plan.includedLabel}
        </p>
        <ul className="mt-3 space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3 text-[13px] leading-5 text-[#2a2a2a]">
              <Check className="mt-0.5 size-4 shrink-0 text-[#0d0d0d]" strokeWidth={2} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function BusinessPlanCard({
  plan,
  onClick,
}: {
  plan: (typeof BUSINESS_PLANS)[number];
  onClick: () => void;
}) {
  return (
    <article className="flex min-h-[430px] flex-col rounded-[18px] border border-[#e5e5e5] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-6 text-[#777]">Business</p>
          <h3 className="mt-2.5 text-[22px] font-medium leading-7 text-[#0d0d0d]">
            {plan.name}
          </h3>
          <p className="mt-6 text-[16px] font-medium leading-6 text-[#222]">
            {plan.subtitle}
          </p>
          <p className="mt-2 max-w-xl text-[15px] leading-6 text-[#555]">
            {plan.description}
          </p>
        </div>
        <Building2 className="size-5 shrink-0 text-[#777]" strokeWidth={1.9} />
      </div>
      <p className="mt-6 text-[26px] font-medium leading-none text-[#0d0d0d]">
        {plan.price}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
      >
        {plan.button}
        <ChevronRight className="size-4" />
      </button>
      <div className="mt-6">
        <p className="text-sm font-medium text-[#0d0d0d]">{plan.includedLabel}</p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-4 text-[15px] leading-6 text-[#2a2a2a]">
            <Check className="mt-1 size-4 shrink-0" strokeWidth={2} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

const Subscription: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>(DEFAULT_CREDIT_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [selectedBusinessPlan, setSelectedBusinessPlan] = useState<
    (typeof BUSINESS_PLANS)[number] | null
  >(null);
  const [activeTab, setActiveTab] = useState<BillingTab>("personal");
  const { data: session, isPending } = useSession();

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/packages");
        const data = await res.json();
        if (data.packages?.length > 0) {
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

  const resolvedPlans = useMemo(
    () =>
      PLANS.map((plan) => ({
        plan,
        packageInfo: getPlanPackage(plan, packages),
      })),
    [packages]
  );
  const comparisonPlans =
    activeTab === "personal"
      ? PLANS.map((plan) => plan.name.replace("小象", ""))
      : BUSINESS_PLANS.map((plan) => plan.name);
  const comparisonRows =
    activeTab === "personal" ? PERSONAL_COMPARE_ROWS : BUSINESS_COMPARE_ROWS;
  const capabilityTiles =
    activeTab === "personal"
      ? [
          { icon: ImageIcon, text: "图像生成默认 10 积分" },
          { icon: Video, text: "快速视频默认 30 积分" },
          { icon: CreditCard, text: "高质量视频默认 100 积分" },
        ]
      : [
          { icon: Building2, text: "团队额度由管理员确认开通" },
          { icon: CreditCard, text: "订单和发票人工处理" },
          { icon: Video, text: "图像和视频用量统一规划" },
        ];

  const handleBusinessContact = (plan: (typeof BUSINESS_PLANS)[number]) => {
    if (!isPending && !session?.user) {
      setLoginDialogOpen(true);
      return;
    }

    setSelectedBusinessPlan(plan);
    setBusinessDialogOpen(true);
  };

  const handlePurchase = (pkg: Package | null) => {
    if (!pkg) {
      toast.error("这个套餐还没有上架，请先选择其他套餐");
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
    <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-white font-sans text-[#0d0d0d]">
      <Link
        href="/studio"
        className="fixed right-4 top-4 z-30 flex size-11 items-center justify-center rounded-full text-[#777] transition hover:bg-black/5 hover:text-[#0d0d0d] md:right-8 md:top-8"
        aria-label="关闭"
      >
        <X className="size-6" strokeWidth={1.8} />
      </Link>

      <main className="mx-auto flex min-h-screen w-full max-w-[1840px] flex-col px-4 pb-12 pt-20 md:px-8 md:pb-16 md:pt-24">
        <section className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p className="text-sm text-[#777]">{APP_BRAND}</p>
          <h1 className="mt-4 text-[36px] font-medium leading-tight tracking-normal text-[#0d0d0d] md:text-[42px]">
            升级你的计划
          </h1>
          <div className="mt-8 inline-flex rounded-full bg-[#ececec] p-1 shadow-inner">
            {[
              { value: "personal" as const, label: "Personal" },
              { value: "business" as const, label: "Business" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "h-11 min-w-[112px] rounded-full px-5 text-[16px] font-medium transition",
                  activeTab === tab.value
                    ? "bg-white text-[#0d0d0d] shadow-[0_1px_5px_rgba(0,0,0,0.18)]"
                    : "text-[#8a8a8a] hover:text-[#0d0d0d]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          {activeTab === "personal" ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {resolvedPlans.map(({ plan, packageInfo }) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  packageInfo={packageInfo}
                  loading={loading}
                  onPurchase={() => handlePurchase(packageInfo)}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto grid max-w-[960px] gap-6 md:grid-cols-3">
              {BUSINESS_PLANS.map((plan) => (
                <BusinessPlanCard
                  key={plan.name}
                  plan={plan}
                  onClick={() => handleBusinessContact(plan)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto mt-8 grid w-full max-w-[1080px] gap-3 text-sm leading-6 text-[#555] md:grid-cols-3">
          {capabilityTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.text}
                className="flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-4 py-3"
              >
                <Icon className="size-4 text-[#0d0d0d]" strokeWidth={1.9} />
                <span>{tile.text}</span>
              </div>
            );
          })}
        </section>

        <section className="mx-auto mt-8 w-full max-w-[1080px] overflow-x-auto rounded-[18px] border border-[#e5e5e5] bg-white">
          <table
            className={cn(
              "w-full border-collapse text-left text-sm",
              activeTab === "personal" ? "min-w-[760px]" : "min-w-[620px]"
            )}
          >
            <thead>
              <tr className="border-b border-[#eeeeee]">
                <th className="w-[180px] px-5 py-4 font-medium text-[#555]">
                  能力
                </th>
                {comparisonPlans.map((name) => (
                  <th key={name} className="px-5 py-4 font-medium text-[#0d0d0d]">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-[#eeeeee] last:border-b-0">
                  <td className="px-5 py-4 font-medium text-[#0d0d0d]">
                    {row.feature}
                  </td>
                  {row.values.map((value, index) => (
                    <td key={`${row.feature}-${index}`} className="px-5 py-4 text-[#555]">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mx-auto mt-5 flex max-w-[1080px] items-center gap-2 text-sm leading-6 text-[#666]">
          <CircleDollarSign className="size-4 shrink-0 text-[#777]" strokeWidth={1.9} />
          <p>
            已有计划或订单问题，可在个人中心查看积分记录；当前页面只创建订单，不会自动扣款。
          </p>
        </section>
      </main>

      <CreditPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedPackage={selectedPackage}
        onUnauthorized={() => {
          setDialogOpen(false);
          setLoginDialogOpen(true);
        }}
      />
      <BusinessContactDialog
        open={businessDialogOpen}
        onOpenChange={setBusinessDialogOpen}
        plan={selectedBusinessPlan}
        userEmail={session?.user?.email ?? null}
      />
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
};

export default Subscription;
