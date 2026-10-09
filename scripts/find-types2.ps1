$lines = Get-Content "D:/Loan_Reminder/src/lib/i18n/types.ts"
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "ui.termsIntro|ui.timelineReminderDescription|ui.smsPreviewLabel|ui.emailPreviewLabel") {
    Write-Output ("{0}: {1}" -f ($i + 1), $lines[$i])
  }
}
