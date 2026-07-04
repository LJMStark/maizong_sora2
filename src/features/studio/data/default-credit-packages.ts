export type DefaultCreditPackage = {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits: number | null;
  dailyCredits: number | null;
  durationDays: number | null;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export const DEFAULT_CREDIT_PACKAGES: DefaultCreditPackage[] = [
  {
    id: "subscription_monthly_trial_199",
    name: "小象体验卡",
    type: "subscription",
    credits: 60,
    dailyCredits: 5,
    durationDays: 3,
    price: 1990,
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "subscription_monthly_starter",
    name: "小象月卡",
    type: "subscription",
    credits: 200,
    dailyCredits: 10,
    durationDays: 30,
    price: 19900,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "subscription_monthly_pro",
    name: "小象专业卡",
    type: "subscription",
    credits: 1200,
    dailyCredits: 40,
    durationDays: 30,
    price: 59900,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: "subscription_yearly_flagship_3800",
    name: "小象年卡",
    type: "subscription",
    credits: 8000,
    dailyCredits: 300,
    durationDays: 365,
    price: 380000,
    sortOrder: 30,
    isActive: true,
  },
];

export function findDefaultCreditPackage(id: string) {
  return DEFAULT_CREDIT_PACKAGES.find((pkg) => pkg.id === id && pkg.isActive);
}
