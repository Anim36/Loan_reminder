// Edit a loan
// Maps to Figma frame: Edit a loan (10:5180 / 10:5298).
//
// Server component so we can load the loan and hand the prefill to the
// client form. The form itself lives in @/components/forms/loan-form so
// the same component backs /loans/new too.
//
// `instant = false` opts this route out of static prerendering because it
// reads `params` (which Next 16 treats as runtime data under
// cacheComponents).
import { notFound } from "next/navigation";
import { LoanForm } from "@/components/forms/loan-form";
import { getLoan } from "@/services/loanService";

export const dynamic = "force-dynamic";

export default async function EditLoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loan = await getLoan(id);
  if (!loan) notFound();
  return <LoanForm mode="edit" initial={loan} />;
}
