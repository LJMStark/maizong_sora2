"use client";

import React, { useEffect, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { CreditPurchaseDialog } from "./credit-purchase-dialog";

interface Package {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits: number | null;
  dailyCredits: number | null;
  durationDays: number | null;
  price: number;
}

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

function PackageSkeleton() {
  return (
    <div className="p-6 md:p-8 flex-1 flex flex-col animate-pulse">
      <div className="mb-6">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="mt-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-12 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
}

const Subscription: React.FC = () => {
  const t = useTranslations("studio.subscription");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      } finally {
        setLoading(false);
      }
    }
    fetchPackages();
  }, []);

  const creditPackages = packages.filter((p) => p.type === "package");
  const subscriptionPackages = packages.filter((p) => p.type === "subscription");

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
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={
                        i < 3
                          ? "border-b sm:border-b-0 sm:border-r border-[#e5e5e1]"
                          : ""
                      }
                    >
                      <PackageSkeleton />
                    </div>
                  ))
                ) : (
                  creditPackages.map((pkg, index) => (
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
                  ))
                )}
              </div>
            </TabPanel>

            <TabPanel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e5e5e1]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={
                        i < 3
                          ? "border-b sm:border-b-0 sm:border-r border-[#e5e5e1]"
                          : ""
                      }
                    >
                      <PackageSkeleton />
                    </div>
                  ))
                ) : (
                  subscriptionPackages.map((pkg, index) => (
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
                  ))
                )}
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
