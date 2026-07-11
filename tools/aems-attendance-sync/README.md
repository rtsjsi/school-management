# AEMS Attendance Sync

Windows **x86** tools for biometric attendance machines (SBXPC protocol):

- **AEMSAttendanceSync.exe** — tray app (scheduled pull)
- **AEMSAttendanceSync-Setup.exe** — installer (Program Files, Start Menu, Desktop)
- **AEMSAttendanceSync-CLI.exe** — command-line utility (logs, users, enroll)

## Requirements

- Windows 10/11 PC on the same LAN as the device
- Device TCP port **5005** (default)
- .NET Framework 4.0+ (built-in on modern Windows)

## Build installer (recommended for school PCs)

```powershell
powershell -ExecutionPolicy Bypass -File .\package-installer.ps1
```

Output: `dist\AEMSAttendanceSync-Installer\`  
Zip that folder and run `AEMSAttendanceSync-Setup.exe` on the school PC.

## Build portable tray app

```powershell
powershell -ExecutionPolicy Bypass -File .\package-portable.ps1
```

Output: `dist\AEMSAttendanceSync\` — copy folder and run `AEMSAttendanceSync.exe`.

## Build CLI

```powershell
& "C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe" AEMSAttendanceSync.Cli.csproj /p:Configuration=Debug /p:Platform=x86
```

Output: `bin\x86\Debug\AEMSAttendanceSync-CLI.exe`

## Configure

Edit `config.json` (or use Settings in the tray app):

```json
{
  "machineNumber": 1,
  "ip": "192.168.68.59",
  "port": 5005,
  "password": 0,
  "intervalMinutes": 5,
  "pullAll": false,
  "startWithWindows": true,
  "configured": false
}
```

## CLI examples

```powershell
cd bin\x86\Debug
.\AEMSAttendanceSync-CLI.exe connect
.\AEMSAttendanceSync-CLI.exe pull-logs --all --out punches.csv
.\AEMSAttendanceSync-CLI.exe list-users --names --out users.csv
.\AEMSAttendanceSync-CLI.exe slog-info
```

### Keep only active enrolls (delete everyone else on the device)

```powershell
# Preview (no deletes):
.\AEMSAttendanceSync-CLI.exe keep-users --keep-file ..\..\..\active-enrolls.txt

# Apply deletes:
.\AEMSAttendanceSync-CLI.exe keep-users --keep-file ..\..\..\active-enrolls.txt --confirm
```

`active-enrolls.txt` lists enroll IDs to **keep** (42 IDs). Any other enroll on the device is removed. Attendance punch logs (GLog) are not cleared.

Run `.\AEMSAttendanceSync-CLI.exe --help` for the full command list.

## SDK libraries

Native DLLs and P/Invoke wrapper are under `native\` and `sbxpc\`, sourced from the vendor SBXPC sample bundled in the repo docs folder.
