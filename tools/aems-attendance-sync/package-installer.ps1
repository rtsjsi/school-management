# Build AEMS Attendance Sync Windows installer (Program Files + shortcuts)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$msbuild = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe"
$dist = Join-Path $root "dist\AEMSAttendanceSync-Installer"

Write-Host "Building tray app..."
& $msbuild (Join-Path $root "AEMSAttendanceSync.Tray.csproj") /p:Configuration=Release /p:Platform=x86 /v:minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building setup..."
& $msbuild (Join-Path $root "AEMSAttendanceSync.Setup.csproj") /p:Configuration=Release /p:Platform=x86 /v:minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$appBuilt = Join-Path $root "bin\tray\Release"
$setupBuilt = Join-Path $root "bin\setup\Release"

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $dist "app") | Out-Null

Copy-Item (Join-Path $setupBuilt "AEMSAttendanceSync-Setup.exe") $dist -Force
Copy-Item (Join-Path $appBuilt "*") (Join-Path $dist "app") -Recurse -Force
Get-ChildItem (Join-Path $dist "app") -Filter *.pdb -Recurse | Remove-Item -Force
# Remove nested tray folder copy if present
$nested = Join-Path $dist "app\tray"
if (Test-Path $nested) { Remove-Item $nested -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $dist "app\logs") -Force | Out-Null

@"
AEMS Attendance Sync Installer
==============================

1. Right-click AEMSAttendanceSync-Setup.exe -> Run as administrator
   (or just double-click; Windows will ask for admin permission)
2. Click Install
3. Open "AEMS Attendance Sync" from Desktop or Start Menu
4. Enter the machine IP -> Test connection -> Save & Start

Keep this folder together: Setup.exe needs the "app" subfolder.

Uninstall: Start Menu -> AEMS Attendance Sync -> Uninstall
           or Windows Settings -> Apps -> AEMS Attendance Sync
"@ | Set-Content -Path (Join-Path $dist "README.txt") -Encoding ASCII

Write-Host ""
Write-Host "Installer package ready:"
Write-Host "  $dist"
Write-Host "Give the school the whole AEMSAttendanceSync-Installer folder (or zip it)."
