Select-String -Path "D:\Loan_Reminder\src\app\(app)\loans\page.tsx" -Pattern 't\["loans' | ForEach-Object { $_.LineNumber.ToString() + ": " + $_.Line }
