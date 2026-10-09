$lines = Get-Content "D:/Loan_Reminder/src/lib/i18n/types.ts"
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "ui.dashboard.eyebrow|ui.dashboard.overlineDate|ui.dashboard.date|ui.landing.overline|ui.loanForm.preview|ui.timelineReminderDescription|ui.amountPreview|ui.smsPreviewLabel|ui.emailPreviewLabel|ui.dashboardGreetingPrefix|ui.dashboard.goodDay|ui.dashboard.greeting") {
    Write-Output ("{0}: {1}" -f ($i + 1), $lines[$i])
  }
}
