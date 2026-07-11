# AEMS Attendance Sync

Windows **x86** tools for biometric attendance machines (SBXPC protocol):

- **AEMSAttendanceSync.exe** — tray app (scheduled pull + optional cloud push)
- **AEMSAttendanceSync-Setup.exe** — single-file installer (embeds the app; no extra folder to copy)
- **AEMSAttendanceSync-CLI.exe** — command-line utility (logs, users, enroll)

## Requirements

- Windows 10/11 PC on the same LAN as the device
- Device TCP port **5005** (default)
- .NET Framework 4.0+ (built-in on modern Windows)
- For cloud push: school management app URL + `ATTENDANCE_SYNC_API_KEY`

## Cloud push (raw punches → Supabase)

After each device pull, the tray can POST punches to:

`POST {apiBaseUrl}/api/attendance-sync`

Authorization: `Bearer {apiKey}` (same value as server env `ATTENDANCE_SYNC_API_KEY`).

The API **only** inserts into `biometric_attendance_raw` (duplicates skipped). It does not update payroll tables.

1. Set `ATTENDANCE_SYNC_API_KEY` on the web host (`.env.local` / `.env.development` / hosting env).
2. In tray **Settings**: School app URL, API key, enable “Push punches…”.
3. Local CSV under `%LocalAppData%\AEMS Attendance Sync\logs\` remains the offline backup.
4. Failed pushes are queued in `pending_push\` and retried on the next sync.

Occasional full dumps (`pullAll: true`) are safe — the server unique key ignores punches already stored.

## Build installer (single-file Setup.exe)

```powershell
powershell -ExecutionPolicy Bypass -File .\package-installer.ps1
```

Output: `dist\AEMSAttendanceSync-Installer\AEMSAttendanceSync-Setup.exe`  
That one EXE embeds the whole app — copy only that file to the school PC and run as administrator.

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
  "configured": false,
  "apiBaseUrl": "https://your-school-app.example.com",
  "apiKey": "same-as-ATTENDANCE_SYNC_API_KEY",
  "pushEnabled": false
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

Native DLLs and P/Invoke wrapper are under `native\` and `sbxpc\` (vendor SBXPC / Z500 SDK).
