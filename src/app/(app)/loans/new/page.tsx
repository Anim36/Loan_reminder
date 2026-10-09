// Add a loan
// Maps to Figma frames: Add a loan (10:4953 / 10:5070),
// Field states (10:5409), Date picker open (10:5468 — desktop only, may fail).
//
// The form itself lives in @/components/forms/loan-form so the same
// component backs /loans/[id]/edit too.
import { LoanForm } from "@/components/forms/loan-form";

export default function NewLoanPage() {
  return <LoanForm mode="create" />;
}
