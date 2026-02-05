"use client";

import React from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { CreditPurchaseDialog } from "./credit-purchase-dialog";

interface Package {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits?: number;
  dailyCredits?: number;
  durationDays?: number;
  price: number;
}

const creditPackages: Package[] = [
  {
    id: "pkg-basic",
    name: "启智积分包（基础版）",
    type: "package",
    credits: 100,
    price: 990,
  },
  {
    id: "pkg-advanced",
    name: "迅驰智算套餐（进阶版）",
    type: "package",
    credits: 1000,
    price: 6880,
  },
  {
    id: "pkg-premium",
    name: "星云超算方案（高级版）",
    type: "package",
    credits: 3000,
    price: 13880,
  },
  {
    id: "pkg-flagship",
    name: "银河积分旗舰包（旗舰版）",
    type: "package",
    credits: 10000,
    price: 39880,
  },
];

const subscriptionPackages: Package[] = [
  {
    id: "sub-day",
    name: "体验天卡",
    type: "subscription",
    dailyCredits: 30,
    durationDays: 1,
    price: 288,
  },
  {
    id: "sub-month",
    name: "超值月卡",
    type: "subscription",
    dailyCredits: 30,
    durationDays: 30,
    price: 5880,
  },
  {
    id: "sub-halfyear",
    name: "劲爆半年",
    type: "subscription",
    dailyCredits: 40,
    durationDays: 180,
    price: 19800,
  },
  {
    id: "sub-year",
    name: "无敌年卡",
    type: "subscription",
    dailyCredits: 50,
    durationDays: 365,
    price: 39880,
  },
];

function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

function PackageCard({
  pkg,
  onPurchase,
  isHighlighted = false,
}: {
  pkg: Package;
  onPurchase: (pkg: Package) => void;
  isHighlighted?: boolean;
}) {
  const t = useTranslations("studio.subscription");

  return (
    <div
      className={`relative flex flex-col border transition-all ${
        isHighlighted
          ? "border-[#8C7355] bg-[#faf9f6]"
          : "border-[#e5e5e1] bg-white hover:border-[#8C7355]/50"
      }`}
    >
      {isHighlighted && (
        <div className="absolute -top-3 right-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border border-[#8C7355] text-[#8C7355] bg-white">
            推荐
          </span>
        </div>
      )}

      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h3 className="font-serif text-xl italic text-[#1a1a1a] mb-2">
            {pkg.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8C7355] text-lg">
              bolt
            </span>
            {pkg.type === "package" ? (
              <span className="text-sm text-[#4b5563]">{pkg.credits} 积分</span>
            ) : (
              <span className="text-sm text-[#4b5563]">
                时长 {pkg.durationDays} 天
              </span>
            )}
          </div>
        </div>

        {pkg.type === "subscription" && (
          <div className="mb-6 text-xs uppercase tracking-[0.15em] text-[#8C7355] font-medium">
            每日发放 {pkg.dailyCredits} 积分
          </div>
        )}

        <div className="mt-auto">
          <div className="text-3xl font-light text-[#1a1a1a] mb-6">
            {formatPrice(pkg.price)}
          </div>

          <button
            onClick={() => onPurchase(pkg)}
            className={`w-full py-4 px-6 text-[12px] font-bold uppercase tracking-widest transition-colors ${
              isHighlighted
                ? "bg-[#8C7355] text-white hover:bg-[#7a6349]"
                : "border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {t("purchase.button")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberIntro() {
  const t = useTranslations("studio.subscription.memberIntro");

  const benefits = [
    t("benefits.autoGrant"),
    t("benefits.noExpire"),
    t("benefits.autoCollect"),
    t("benefits.costEffective"),
  ];

  return (
    <div className="mt-12 border border-[#e5e5e1] bg-white p-8 md:p-10">
      <h3 className="text-xs uppercase tracking-[0.2em] text-[#4b5563] mb-6">
        {t("title")}
      </h3>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => (
          <li
            key={index}
            className="flex items-center gap-3 text-sm text-[#1a1a1a]"
          >
            <span className="material-symbols-outlined text-[#8C7355] text-lg">
              check_circle
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

const Subscription: React.FC = () => {
  const t = useTranslations("studio.subscription");
  const [selectedPackage, setSelectedPackage] = React.useState<Package | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handlePurchase = (pkg: Package) => {
    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf9f6] font-sans">
      <div className="p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8 md:gap-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-serif text-[#1a1a1a] italic">
            {t("title")}
          </h1>
          <p className="text-[#4b5563] text-base font-normal tracking-wide max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <div className="border-b border-[#e5e5e1]">
            <TabList className="flex gap-8 md:gap-12">
              <Tab className="pb-4 border-b-2 text-sm uppercase tracking-[0.2em] transition-colors focus:outline-none data-[selected]:border-[#1a1a1a] data-[selected]:text-[#1a1a1a] data-[selected]:font-bold border-transparent text-[#4b5563] hover:text-[#1a1a1a]">
                {t("tabs.package")}
              </Tab>
              <Tab className="pb-4 border-b-2 text-sm uppercase tracking-[0.2em] transition-colors focus:outline-none data-[selected]:border-[#8C7355] data-[selected]:text-[#8C7355] data-[selected]:font-bold border-transparent text-[#4b5563] hover:text-[#1a1a1a]">
                {t("tabs.subscription")}
              </Tab>
            </TabList>
          </div>

          <TabPanels className="mt-8">
            <TabPanel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e5e5e1]">
                {creditPackages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className={
                      index < creditPackages.length - 1
                        ? "border-b sm:border-b-0 sm:border-r border-[#e5e5e1] lg:last:border-r-0"
                        : ""
                    }
                  >
                    <PackageCard
                      pkg={pkg}
                      onPurchase={handlePurchase}
                      isHighlighted={index === 0}
                    />
                  </div>
                ))}
              </div>
            </TabPanel>

            <TabPanel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e5e5e1]">
                {subscriptionPackages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className={
                      index < subscriptionPackages.length - 1
                        ? "border-b sm:border-b-0 sm:border-r border-[#e5e5e1] lg:last:border-r-0"
                        : ""
                    }
                  >
                    <PackageCard
                      pkg={pkg}
                      onPurchase={handlePurchase}
                      isHighlighted={index === 1}
                    />
                  </div>
                ))}
              </div>
              <MemberIntro />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      <CreditPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedPackage={selectedPackage}
      />
    </div>
  );
};

export default Subscription;
