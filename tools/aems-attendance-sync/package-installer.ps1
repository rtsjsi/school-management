# Build a single-file AEMS Attendance Sync installer (app embedded in Setup.exe)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$msbuild = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe"
$dist = Join-Path $root "dist\AEMSAttendanceSync-Installer"
$packPath = Join-Path $root "setup\payload.pack"

function New-PayloadPack {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir,
        [Parameter(Mandatory = $true)][string]$OutFile
    )

    $files = Get-ChildItem -Path $SourceDir -Recurse -File |
        Where-Object {
            $_.Extension -ne ".pdb" -and
            $_.Name -ne "AEMSAttendanceSync-Setup.exe" -and
            $_.DirectoryName -notmatch '\\logs$'
        }

    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms, [System.Text.Encoding]::UTF8)
    $bw.Write([int]$files.Count)

    foreach ($f in $files) {
        $rel = $f.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
        $relBytes = [System.Text.Encoding]::UTF8.GetBytes($rel.Replace('\', '/'))
        $data = [System.IO.File]::ReadAllBytes($f.FullName)
        $bw.Write([int]$relBytes.Length)
        $bw.Write($relBytes)
        $bw.Write([int]$data.Length)
        $bw.Write($data)
    }

    $bw.Flush()
    [System.IO.File]::WriteAllBytes($OutFile, $ms.ToArray())
    $bw.Close()
    $ms.Close()
    Write-Host ("Packed {0} files -> {1} ({2:N0} bytes)" -f $files.Count, $OutFile, (Get-Item $OutFile).Length)
}

Write-Host "Building tray app..."
& $msbuild (Join-Path $root "AEMSAttendanceSync.Tray.csproj") /p:Configuration=Release /p:Platform=x86 /v:minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$appBuilt = Join-Path $root "bin\tray\Release"
if (!(Test-Path (Join-Path $appBuilt "AEMSAttendanceSync.exe"))) {
    throw "Tray build output not found: $appBuilt"
}

Write-Host "Creating embedded payload..."
New-Item -ItemType Directory -Path (Join-Path $root "setup") -Force | Out-Null
New-PayloadPack -SourceDir $appBuilt -OutFile $packPath

Write-Host "Building single-file setup..."
& $msbuild (Join-Path $root "AEMSAttendanceSync.Setup.csproj") /p:Configuration=Release /p:Platform=x86 /v:minimal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$setupBuilt = Join-Path $root "bin\setup\Release\AEMSAttendanceSync-Setup.exe"
if (!(Test-Path $setupBuilt)) { throw "Setup build output not found." }

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item $setupBuilt $dist -Force

$readme = @"
AEMS Attendance Sync Installer (single file)
============================================

1. Copy AEMSAttendanceSync-Setup.exe to the school PC (this file alone is enough).
2. Right-click -> Run as administrator (or double-click; Windows will ask for admin).
3. Click Install
4. Open "AEMS Attendance Sync" from Desktop or Start Menu
5. Settings: device IP, School app URL, API key, enable cloud push

Uninstall: Start Menu -> AEMS Attendance Sync -> Uninstall
           or Windows Settings -> Apps -> AEMS Attendance Sync
"@
Set-Content -Path (Join-Path $dist "README.txt") -Value $readme -Encoding ASCII

$zip = Join-Path $root "dist\AEMSAttendanceSync-Setup.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
# Zip just the single EXE for easy transfer
Compress-Archive -Path (Join-Path $dist "AEMSAttendanceSync-Setup.exe") -DestinationPath $zip -Force

Write-Host ""
Write-Host "Single-file installer ready:"
Write-Host "  $(Join-Path $dist 'AEMSAttendanceSync-Setup.exe')"
Write-Host "  $zip"
Write-Host "Carry only AEMSAttendanceSync-Setup.exe - no app folder needed."
