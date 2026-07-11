# Build portable AEMS Attendance Sync folder (plug & play)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$msbuild = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe"
$out = Join-Path $root "dist\AEMSAttendanceSync"

& $msbuild (Join-Path $root "AEMSAttendanceSync.Tray.csproj") /p:Configuration=Release /p:Platform=x86 /v:minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$built = Join-Path $root "bin\tray\Release"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null
Copy-Item (Join-Path $built "*") $out -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $out "logs") -Force | Out-Null

Write-Host ""
Write-Host "Portable app ready:"
Write-Host "  $out"
Write-Host "Copy that folder to the school PC and run AEMSAttendanceSync.exe"
