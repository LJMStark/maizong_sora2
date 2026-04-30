import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';

export function GenderRadioGroup({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  const t = useTranslations('auth.signup.genderOptions');

  const options = [
    { id: "male", label: t('male'), value: false },
    { id: "female", label: t('female'), value: true },
  ];

  return (
    <RadioGroup
      value={String(value)}
      onValueChange={(val) => onChange(val === "true")}
      className="grid grid-cols-2 gap-3"
    >
      {options.map((opt) => (
        <div
          key={opt.id}
          className={cn(
            "mt-2 flex h-12 items-center rounded-full border px-4 transition-colors",
            value === opt.value
              ? "border-[#0d0d0d] bg-[#0d0d0d] text-white"
              : "border-[#d9d9d9] bg-white text-[#5f5f5f] hover:bg-[#f7f7f7]",
          )}
        >
          <RadioGroupItem
            id={opt.id}
            value={String(opt.value)}
            className="peer sr-only"
          />
          <Label
            htmlFor={opt.id}
            className="mx-auto flex w-full cursor-pointer items-center justify-center text-sm font-medium transition-all duration-300"
          >
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
