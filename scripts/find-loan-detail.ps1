$p = 'D:\Loan_Reminder\src\app\(app)\loans\[id]\page.tsx'
$lines = Get-Content $p
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "overdueBy|isPartial|toast\.show|SMS|Email|t\[") {
    Write-Output ("{0}: {1}" -f ($i + 1), $lines[$i])
  }
}
