$f = Get-ChildItem -Path "D:\Loan_Reminder\src\app\(app)\loans\[id]" -Filter "page.tsx" | Select-Object -First 1
$lines = Get-Content $f.FullName
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'loans\.|t\["common\.|SMS|Email|p\.method|toast\.show') {
    Write-Output ("{0}: {1}" -f ($i + 1), $lines[$i])
  }
}