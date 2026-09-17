import { BadgeCheck, CircleHelp } from "lucide-react";
export function VerificationBadge({ verified }: { verified: boolean }) {
  const Icon = verified ? BadgeCheck : CircleHelp;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${verified ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {verified ? "Verified" : "Needs verification"}
    </span>
  );
}
