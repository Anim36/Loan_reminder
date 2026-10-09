$routes = @(
  "/dashboard",
  "/loans",
  "/loans/loan-tanvir-2026-09-22",
  "/friends",
  "/reminders",
  "/reminders/history",
  "/notifications",
  "/reports",
  "/settings"
)
foreach ($r in $routes) {
  $code = (Invoke-WebRequest -Uri "http://localhost:3001$r" -UseBasicParsing -TimeoutSec 30 -ErrorAction SilentlyContinue).StatusCode
  Write-Host "$r $code"
}
