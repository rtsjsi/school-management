using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace AemsAttendanceSync
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                if (args.Length == 0 || IsHelp(args[0]))
                {
                    PrintUsage();
                    return args.Length == 0 ? 1 : 0;
                }

                string command = args[0].Trim().ToLowerInvariant();
                if (command == "self-test")
                    return CmdSelfTest();

                var options = ParseOptions(args, 1);
                var settings = LoadSettings(options);

                switch (command)
                {
                    case "connect":
                        return CmdConnect(settings);
                    case "pull-logs":
                        return CmdPullLogs(settings, options);
                    case "log-info":
                        return CmdLogInfo(settings);
                    case "delete-logs":
                        return CmdDeleteLogs(settings, options);
                    case "pull-slogs":
                        return CmdPullSLogs(settings, options);
                    case "slog-info":
                        return CmdSLogInfo(settings);
                    case "delete-slogs":
                        return CmdDeleteSLogs(settings, options);
                    case "list-users":
                        return CmdListUsers(settings, options);
                    case "get-name":
                        return CmdGetName(settings, options);
                    case "set-name":
                        return CmdSetName(settings, options);
                    case "get-enroll":
                        return CmdGetEnroll(settings, options);
                    case "set-enroll":
                        return CmdSetEnroll(settings, options);
                    case "delete-enroll":
                        return CmdDeleteEnroll(settings, options);
                    case "enable-user":
                        return CmdEnableUser(settings, options, true);
                    case "disable-user":
                        return CmdEnableUser(settings, options, false);
                    case "empty-enrolls":
                        return CmdEmptyEnrolls(settings, options);
                    case "keep-users":
                        return CmdKeepUsers(settings, options);
                    case "disconnect":
                        Console.WriteLine("Sessions are per-process. Disconnect runs automatically after each command.");
                        return 0;
                    default:
                        Console.Error.WriteLine("Unknown command: " + args[0]);
                        PrintUsage();
                        return 1;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("ERROR: " + ex.Message);
                return 1;
            }
        }

        static int CmdSelfTest()
        {
            int failures = 0;
            // DutyOn + Fingerprint
            failures += AssertEq("Fingerprint", GLogDecoder.DecodeVerifyMethod(1), "method fp");
            failures += AssertEq("IN", GLogDecoder.DecodeSimpleDirection(1), "dir fp dutyon");
            // DutyOff in high byte
            int dutyOffFp = 1 | (1 << 8);
            failures += AssertEq("OUT", GLogDecoder.DecodeSimpleDirection(dutyOffFp), "dir dutyoff");
            failures += AssertEq("DutyOff", GLogDecoder.DecodeDirection(dutyOffFp), "status dutyoff");
            // Legacy card OUT
            failures += AssertEq("OUT", GLogDecoder.DecodeSimpleDirection(103), "dir card out");
            failures += AssertEq("Card", GLogDecoder.DecodeVerifyMethod(103), "method card out");
            // Face GoIn
            int faceGoIn = 30 | (4 << 8);
            failures += AssertEq("IN", GLogDecoder.DecodeSimpleDirection(faceGoIn), "dir face goin");
            failures += AssertEq("Face", GLogDecoder.DecodeVerifyMethod(faceGoIn), "method face");

            // SLog decoder
            failures += AssertEq("Enroll User", SLogDecoder.DecodeManipulation(3), "slog enroll");
            failures += AssertEq("Delete All LogData", SLogDecoder.DecodeManipulation(8), "slog delete all");
            failures += AssertEq("Modify System Time", SLogDecoder.DecodeManipulation(10), "slog time");
            failures += AssertEq("Delete Face", SLogDecoder.DecodeManipulation(14), "slog face");
            failures += AssertEq("Finger0", SLogDecoder.DecodeFingerOrMedia(0), "slog finger0");
            failures += AssertEq("Password", SLogDecoder.DecodeFingerOrMedia(10), "slog pwd");
            failures += AssertEq("Face", SLogDecoder.DecodeFingerOrMedia(14), "slog media face");

            if (failures == 0)
            {
                Console.WriteLine("self-test OK (GLog + SLog decoders).");
                return 0;
            }

            Console.Error.WriteLine("self-test FAILED: {0} assertion(s)", failures);
            return 1;
        }

        static int AssertEq(string expected, string actual, string label)
        {
            if (string.Equals(expected, actual, StringComparison.Ordinal))
                return 0;
            Console.Error.WriteLine("  FAIL {0}: expected '{1}', got '{2}'", label, expected, actual);
            return 1;
        }

        static int CmdConnect(DeviceSettings settings)
        {
            Console.WriteLine("Connecting to {0}:{1} (machine={2}, password={3}) ...",
                settings.Ip, settings.Port, settings.MachineNumber, settings.Password);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                Console.WriteLine("Connected OK.");
                client.Disconnect();
                Console.WriteLine("Disconnected.");
                return 0;
            }
        }

        static int CmdPullLogs(DeviceSettings settings, Dictionary<string, string> options)
        {
            bool all = HasFlag(options, "all");
            string outPath = GetOpt(options, "out");
            string fromPosText = GetOpt(options, "from-pos");
            string toPosText = GetOpt(options, "to-pos");
            bool byPos = !string.IsNullOrWhiteSpace(fromPosText) || !string.IsNullOrWhiteSpace(toPosText);

            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                List<PunchRecord> punches;
                if (byPos)
                {
                    if (string.IsNullOrWhiteSpace(fromPosText) || string.IsNullOrWhiteSpace(toPosText))
                    {
                        Console.Error.WriteLine("Both --from-pos and --to-pos are required for position pull.");
                        return 1;
                    }
                    int fromPos = int.Parse(fromPosText, CultureInfo.InvariantCulture);
                    int toPos = int.Parse(toPosText, CultureInfo.InvariantCulture);
                    Console.WriteLine("Pulling GLogs by position {0} .. {1} ...", fromPos, toPos);
                    punches = client.PullGLogsByPos(fromPos, toPos);
                }
                else
                {
                    Console.WriteLine(all
                        ? "Pulling ALL GLogs (ReadAllGLogData) ..."
                        : "Pulling unread GLogs (ReadGeneralLogData, readMark=1) ...");
                    punches = client.PullGLogs(all);
                }

                PunchExporter.WriteConsole(punches);

                if (!string.IsNullOrWhiteSpace(outPath))
                {
                    string full = Path.GetFullPath(outPath);
                    PunchExporter.WriteFile(punches, full);
                    Console.WriteLine("Wrote {0}", full);
                }

                client.Disconnect();
                Console.WriteLine("Disconnected. (Device logs were NOT cleared.)");
                return 0;
            }
        }

        static int CmdLogInfo(DeviceSettings settings)
        {
            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                GLogPosInfo info = client.GetGLogPosInfo();
                Console.WriteLine();
                Console.WriteLine("GLog position info:");
                Console.WriteLine("  LogCount : {0}", info.LogCount);
                Console.WriteLine("  StartPos : {0}", info.StartPos);
                Console.WriteLine("  EndPos   : {0}", info.EndPos);
                Console.WriteLine("  MaxCount : {0}", info.MaxCount);
                Console.WriteLine("  ValidPos : {0} .. {1}", info.MinPos, info.MaxPos);
                Console.WriteLine();

                int suggestedEnd = info.EndPos;
                if (suggestedEnd < 0 && info.LogCount > 0)
                    suggestedEnd = info.StartPos + info.LogCount - 1;

                if (suggestedEnd >= 0)
                {
                    Console.WriteLine("Safe workflow:");
                    Console.WriteLine("  1) Preview:  pull-logs --from-pos {0} --to-pos {1} --out preview.csv",
                        info.StartPos, suggestedEnd);
                    Console.WriteLine("  2) Delete:   delete-logs --to-pos {0} --confirm", suggestedEnd);
                    if (info.EndPos < 0)
                        Console.WriteLine("  (EndPos was -1; suggested EndPos = StartPos + LogCount - 1)");
                }
                else
                {
                    Console.WriteLine("No logs to delete (LogCount=0).");
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdDeleteLogs(DeviceSettings settings, Dictionary<string, string> options)
        {
            bool all = HasFlag(options, "all");
            string toPosText = GetOpt(options, "to-pos");
            bool confirm = HasFlag(options, "confirm");

            if (!all && string.IsNullOrWhiteSpace(toPosText))
            {
                Console.Error.WriteLine("Specify --to-pos N (selective) or --all (wipe everything).");
                Console.Error.WriteLine("Deletes require --confirm.");
                return 1;
            }

            if (all && !string.IsNullOrWhiteSpace(toPosText))
            {
                Console.Error.WriteLine("Use either --to-pos or --all, not both.");
                return 1;
            }

            if (!confirm)
            {
                Console.Error.WriteLine("Refusing to delete without --confirm.");
                if (all)
                    Console.Error.WriteLine("Example: delete-logs --all --confirm");
                else
                    Console.Error.WriteLine("Example: delete-logs --to-pos {0} --confirm", toPosText);
                return 1;
            }

            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                if (all)
                {
                    Console.WriteLine("WARNING: Clearing ALL attendance GLogs on the device ...");
                    client.EmptyAllGLogs();
                    Console.WriteLine("EmptyGeneralLogData OK — all GLogs cleared.");
                }
                else
                {
                    int toPos = int.Parse(toPosText, CultureInfo.InvariantCulture);
                    Console.WriteLine("Deleting GLogs from start through EndPos={0} ...", toPos);
                    Console.WriteLine("(SDK selective delete = oldest logs up to this position.)");
                    client.DeleteGLogsToPos(toPos);
                    Console.WriteLine("DeleteGLogWithPos OK.");
                }

                try
                {
                    GLogPosInfo info = client.GetGLogPosInfo();
                    Console.WriteLine("After delete: LogCount={0}, StartPos={1}, EndPos={2}",
                        info.LogCount, info.StartPos, info.EndPos);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Could not refresh log-info: {0}", ex.Message);
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdPullSLogs(DeviceSettings settings, Dictionary<string, string> options)
        {
            bool all = HasFlag(options, "all");
            string outPath = GetOpt(options, "out");
            string fromPosText = GetOpt(options, "from-pos");
            string toPosText = GetOpt(options, "to-pos");
            bool byPos = !string.IsNullOrWhiteSpace(fromPosText) || !string.IsNullOrWhiteSpace(toPosText);

            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                List<SLogRecord> logs;
                if (byPos)
                {
                    if (string.IsNullOrWhiteSpace(fromPosText) || string.IsNullOrWhiteSpace(toPosText))
                    {
                        Console.Error.WriteLine("Both --from-pos and --to-pos are required for position pull.");
                        return 1;
                    }
                    int fromPos = int.Parse(fromPosText, CultureInfo.InvariantCulture);
                    int toPos = int.Parse(toPosText, CultureInfo.InvariantCulture);
                    Console.WriteLine("Pulling SLogs by position {0} .. {1} ...", fromPos, toPos);
                    logs = client.PullSLogsByPos(fromPos, toPos);
                }
                else
                {
                    Console.WriteLine(all
                        ? "Pulling ALL SLogs (ReadAllSLogData) ..."
                        : "Pulling unread SLogs (ReadSuperLogData, readMark=1) ...");
                    logs = client.PullSLogs(all);
                }

                SLogExporter.WriteConsole(logs);

                if (!string.IsNullOrWhiteSpace(outPath))
                {
                    string full = Path.GetFullPath(outPath);
                    SLogExporter.WriteFile(logs, full);
                    Console.WriteLine("Wrote {0}", full);
                }

                client.Disconnect();
                Console.WriteLine("Disconnected. (Device SLogs were NOT cleared.)");
                return 0;
            }
        }

        static int CmdSLogInfo(DeviceSettings settings)
        {
            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                GLogPosInfo info = client.GetSLogPosInfo();
                Console.WriteLine();
                Console.WriteLine("SLog position info:");
                Console.WriteLine("  LogCount : {0}", info.LogCount);
                Console.WriteLine("  StartPos : {0}", info.StartPos);
                Console.WriteLine("  EndPos   : {0}", info.EndPos);
                Console.WriteLine("  MaxCount : {0}", info.MaxCount);
                Console.WriteLine("  ValidPos : {0} .. {1}", info.MinPos, info.MaxPos);
                Console.WriteLine();

                int suggestedEnd = info.EndPos;
                if (suggestedEnd < 0 && info.LogCount > 0)
                    suggestedEnd = info.StartPos + info.LogCount - 1;

                if (suggestedEnd >= 0)
                {
                    Console.WriteLine("Safe workflow:");
                    Console.WriteLine("  1) Preview:  pull-slogs --from-pos {0} --to-pos {1} --out slog-preview.csv",
                        info.StartPos, suggestedEnd);
                    Console.WriteLine("  2) Delete:   delete-slogs --to-pos {0} --confirm", suggestedEnd);
                    if (info.EndPos < 0)
                        Console.WriteLine("  (EndPos was -1; suggested EndPos = StartPos + LogCount - 1)");
                }
                else
                {
                    Console.WriteLine("No SLogs to delete (LogCount=0).");
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdDeleteSLogs(DeviceSettings settings, Dictionary<string, string> options)
        {
            bool all = HasFlag(options, "all");
            string toPosText = GetOpt(options, "to-pos");
            bool confirm = HasFlag(options, "confirm");

            if (!all && string.IsNullOrWhiteSpace(toPosText))
            {
                Console.Error.WriteLine("Specify --to-pos N (selective) or --all (wipe everything).");
                Console.Error.WriteLine("Deletes require --confirm.");
                return 1;
            }

            if (all && !string.IsNullOrWhiteSpace(toPosText))
            {
                Console.Error.WriteLine("Use either --to-pos or --all, not both.");
                return 1;
            }

            if (!confirm)
            {
                Console.Error.WriteLine("Refusing to delete without --confirm.");
                if (all)
                    Console.Error.WriteLine("Example: delete-slogs --all --confirm");
                else
                    Console.Error.WriteLine("Example: delete-slogs --to-pos {0} --confirm", toPosText);
                return 1;
            }

            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                if (all)
                {
                    Console.WriteLine("WARNING: Clearing ALL Super Logs (SLogs) on the device ...");
                    client.EmptyAllSLogs();
                    Console.WriteLine("EmptySuperLogData OK — all SLogs cleared.");
                }
                else
                {
                    int toPos = int.Parse(toPosText, CultureInfo.InvariantCulture);
                    Console.WriteLine("Deleting SLogs from start through EndPos={0} ...", toPos);
                    client.DeleteSLogsToPos(toPos);
                    Console.WriteLine("DeleteSLogWithPos OK.");
                }

                try
                {
                    GLogPosInfo info = client.GetSLogPosInfo();
                    Console.WriteLine("After delete: LogCount={0}, StartPos={1}, EndPos={2}",
                        info.LogCount, info.StartPos, info.EndPos);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Could not refresh slog-info: {0}", ex.Message);
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdListUsers(DeviceSettings settings, Dictionary<string, string> options)
        {
            bool names = HasFlag(options, "names");
            string outPath = GetOpt(options, "out");

            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);

            using (var client = new DeviceClient(settings))
            {
                if (!client.Connect())
                {
                    Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                    return 2;
                }

                Console.WriteLine(names
                    ? "Reading all user IDs + names ..."
                    : "Reading all user IDs ...");
                List<UserIdRecord> users = client.ListUsers(names);
                UserExporter.WriteConsole(users);

                if (!string.IsNullOrWhiteSpace(outPath))
                {
                    string full = Path.GetFullPath(outPath);
                    UserExporter.WriteFile(users, full);
                    Console.WriteLine("Wrote {0}", full);
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdGetName(DeviceSettings settings, Dictionary<string, string> options)
        {
            int enrollNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                string name = client.GetUserName(enrollNo);
                Console.WriteLine("Enroll {0} name: {1}", enrollNo, name);
                client.Disconnect();
                return 0;
            }
        }

        static int CmdSetName(DeviceSettings settings, Dictionary<string, string> options)
        {
            int enrollNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;
            string name = GetOpt(options, "name");
            if (name == null)
            {
                Console.Error.WriteLine("Required: --name \"Display Name\"");
                return 1;
            }

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                client.SetUserName(enrollNo, name);
                Console.WriteLine("SetUserName OK: enroll={0}, name={1}", enrollNo, name);
                client.Disconnect();
                return 0;
            }
        }

        static int CmdGetEnroll(DeviceSettings settings, Dictionary<string, string> options)
        {
            int enrollNo, backupNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;
            if (!TryGetBackup(options, out backupNo)) return 1;
            string outPath = GetOpt(options, "out");

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                EnrollTemplate t = client.GetEnrollData(enrollNo, backupNo);
                Console.WriteLine("GetEnrollData OK");
                Console.WriteLine("  Enroll     : {0}", t.EnrollNo);
                Console.WriteLine("  Backup     : {0} ({1})", t.BackupNo, t.BackupLabel);
                Console.WriteLine("  Privilege  : {0}", t.Privilege);
                Console.WriteLine("  Pass/Card  : {0}", t.PasswordOrCard);

                if (!string.IsNullOrWhiteSpace(outPath))
                {
                    string full = Path.GetFullPath(outPath);
                    UserExporter.WriteTemplateBin(t, full);
                    Console.WriteLine("Wrote template {0}", full);
                    Console.WriteLine("Wrote meta     {0}.meta.txt", full);
                }
                else if (BackupDecoder.IsTemplateBackup(t.BackupNo))
                {
                    Console.WriteLine("Tip: pass --out enroll_{0}_{1}.bin to save the template.", enrollNo, t.BackupNo);
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdSetEnroll(DeviceSettings settings, Dictionary<string, string> options)
        {
            int enrollNo, backupNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;
            if (!TryGetBackup(options, out backupNo)) return 1;

            string inPath = GetOpt(options, "in");
            string privilegeText = GetOpt(options, "privilege");
            string passText = GetOpt(options, "password-or-card");
            int privilege = 0;
            int passwordOrCard = 0;
            if (!string.IsNullOrWhiteSpace(privilegeText))
                privilege = int.Parse(privilegeText, CultureInfo.InvariantCulture);
            if (!string.IsNullOrWhiteSpace(passText))
            {
                // Card is often hex in vendor UI; accept decimal or 0x-prefixed hex.
                if (passText.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
                    passwordOrCard = Convert.ToInt32(passText.Substring(2), 16);
                else
                    passwordOrCard = int.Parse(passText, CultureInfo.InvariantCulture);
            }

            int[] templateInts = null;
            int normalized = BackupDecoder.NormalizeBackup(backupNo);
            if (BackupDecoder.IsTemplateBackup(normalized))
            {
                if (string.IsNullOrWhiteSpace(inPath) || !File.Exists(inPath))
                {
                    Console.Error.WriteLine("FP/Face enroll requires --in template.bin");
                    return 1;
                }
                templateInts = UserExporter.ReadTemplateBin(inPath);
            }
            else if (!string.IsNullOrWhiteSpace(inPath) && File.Exists(inPath))
            {
                templateInts = UserExporter.ReadTemplateBin(inPath);
            }
            else
            {
                templateInts = new int[BackupDecoder.MaxTemplateIntCount];
            }

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                client.SetEnrollData(enrollNo, backupNo, privilege, templateInts, passwordOrCard);
                Console.WriteLine("SetEnrollData OK: enroll={0}, backup={1} ({2}), privilege={3}",
                    enrollNo, BackupDecoder.NormalizeBackup(backupNo), BackupDecoder.Label(backupNo), privilege);
                client.Disconnect();
                return 0;
            }
        }

        static int CmdDeleteEnroll(DeviceSettings settings, Dictionary<string, string> options)
        {
            int enrollNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;
            bool allBackups = HasFlag(options, "all-backups");
            bool confirm = HasFlag(options, "confirm");
            if (!confirm)
            {
                Console.Error.WriteLine("Refusing to delete without --confirm.");
                return 1;
            }

            string eMachineText = GetOpt(options, "emachine");

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;

                if (allBackups)
                {
                    List<UserIdRecord> users = client.ListUsers(false);
                    int deleted = 0;
                    int skipped = 0;
                    foreach (var u in users)
                    {
                        if (u.EnrollNo != enrollNo) continue;
                        if (!BackupDecoder.IsDeletableBackup(u.BackupNo))
                        {
                            Console.WriteLine("Skipping enroll={0} backup={1} ({2}) — not a deletable slot",
                                u.EnrollNo, u.BackupNo, u.BackupLabel);
                            skipped++;
                            continue;
                        }
                        Console.WriteLine("Deleting enroll={0} backup={1} ({2}) ...",
                            u.EnrollNo, u.BackupNo, u.BackupLabel);
                        try
                        {
                            client.DeleteEnrollData(u.EnrollNo, u.EMachineNo, u.BackupNo);
                            deleted++;
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine("  WARN: " + ex.Message);
                        }
                    }
                    Console.WriteLine("Deleted {0} enroll slot(s) for enroll {1} (skipped {2}).",
                        deleted, enrollNo, skipped);
                }
                else
                {
                    int backupNo;
                    if (!TryGetBackup(options, out backupNo)) return 1;
                    int eMachine = settings.MachineNumber;
                    if (!string.IsNullOrWhiteSpace(eMachineText))
                        eMachine = int.Parse(eMachineText, CultureInfo.InvariantCulture);

                    client.DeleteEnrollData(enrollNo, eMachine, backupNo);
                    Console.WriteLine("DeleteEnrollData OK: enroll={0}, emachine={1}, backup={2}",
                        enrollNo, eMachine, BackupDecoder.NormalizeBackup(backupNo));
                }

                client.Disconnect();
                return 0;
            }
        }

        static int CmdEnableUser(DeviceSettings settings, Dictionary<string, string> options, bool enabled)
        {
            int enrollNo, backupNo;
            if (!TryGetEnroll(options, out enrollNo)) return 1;
            if (!TryGetBackup(options, out backupNo)) return 1;
            string eMachineText = GetOpt(options, "emachine");
            int eMachine = settings.MachineNumber;
            if (!string.IsNullOrWhiteSpace(eMachineText))
                eMachine = int.Parse(eMachineText, CultureInfo.InvariantCulture);

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                client.EnableUser(enrollNo, eMachine, backupNo, enabled);
                Console.WriteLine("{0} OK: enroll={1}, backup={2}",
                    enabled ? "EnableUser" : "DisableUser", enrollNo, BackupDecoder.NormalizeBackup(backupNo));
                client.Disconnect();
                return 0;
            }
        }

        static int CmdEmptyEnrolls(DeviceSettings settings, Dictionary<string, string> options)
        {
            if (!HasFlag(options, "confirm"))
            {
                Console.Error.WriteLine("Refusing to wipe all enrollments without --confirm.");
                Console.Error.WriteLine("Example: empty-enrolls --confirm");
                return 1;
            }

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;
                Console.WriteLine("WARNING: Clearing ALL enroll data on the device ...");
                client.EmptyAllEnrollData();
                Console.WriteLine("EmptyEnrollData OK.");
                client.Disconnect();
                return 0;
            }
        }

        /// <summary>
        /// Keep enroll IDs listed in a file; delete every other enroll (all backup slots).
        /// Without --confirm: dry-run preview only.
        /// </summary>
        static int CmdKeepUsers(DeviceSettings settings, Dictionary<string, string> options)
        {
            string keepPath = GetOpt(options, "keep-file");
            if (string.IsNullOrWhiteSpace(keepPath))
            {
                Console.Error.WriteLine("Required: --keep-file path.txt");
                Console.Error.WriteLine("Example: keep-users --keep-file active-enrolls.txt");
                Console.Error.WriteLine("         keep-users --keep-file active-enrolls.txt --confirm");
                return 1;
            }

            if (!File.Exists(keepPath))
            {
                Console.Error.WriteLine("Keep file not found: " + keepPath);
                return 1;
            }

            HashSet<int> keep;
            try
            {
                keep = ParseKeepEnrollFile(keepPath);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Failed to read keep file: " + ex.Message);
                return 1;
            }

            if (keep.Count == 0)
            {
                Console.Error.WriteLine("Keep file contains no enroll IDs.");
                return 1;
            }

            bool confirm = HasFlag(options, "confirm");

            using (var client = ConnectOrFail(settings))
            {
                if (client == null) return 2;

                List<UserIdRecord> users = client.ListUsers(false);
                var onDevice = new HashSet<int>();
                var slotsByEnroll = new Dictionary<int, List<UserIdRecord>>();
                foreach (var u in users)
                {
                    onDevice.Add(u.EnrollNo);
                    List<UserIdRecord> list;
                    if (!slotsByEnroll.TryGetValue(u.EnrollNo, out list))
                    {
                        list = new List<UserIdRecord>();
                        slotsByEnroll[u.EnrollNo] = list;
                    }
                    list.Add(u);
                }

                var toDelete = new List<int>();
                foreach (int enroll in onDevice)
                {
                    if (!keep.Contains(enroll))
                        toDelete.Add(enroll);
                }
                toDelete.Sort();

                var missingKeep = new List<int>();
                foreach (int enroll in keep)
                {
                    if (!onDevice.Contains(enroll))
                        missingKeep.Add(enroll);
                }
                missingKeep.Sort();

                int slotCount = 0;
                foreach (int enroll in toDelete)
                    slotCount += slotsByEnroll[enroll].Count;

                Console.WriteLine();
                Console.WriteLine("Keep file:     {0} ({1} ID(s))", keepPath, keep.Count);
                Console.WriteLine("On device:     {0} unique enroll(s), {1} slot(s)", onDevice.Count, users.Count);
                Console.WriteLine("Will KEEP:     {0} enroll(s) that are both in keep list and on device",
                    onDevice.Count - toDelete.Count);
                Console.WriteLine("Will DELETE:   {0} enroll(s), {1} slot(s)", toDelete.Count, slotCount);
                if (missingKeep.Count > 0)
                {
                    Console.WriteLine("Not on device (in keep list, skipped): {0}",
                        string.Join(", ", missingKeep.ConvertAll(n => n.ToString(CultureInfo.InvariantCulture)).ToArray()));
                }

                if (toDelete.Count == 0)
                {
                    Console.WriteLine("Nothing to delete.");
                    client.Disconnect();
                    return 0;
                }

                Console.WriteLine("Enrolls to delete: {0}",
                    string.Join(", ", toDelete.ConvertAll(n => n.ToString(CultureInfo.InvariantCulture)).ToArray()));

                if (!confirm)
                {
                    Console.WriteLine();
                    Console.WriteLine("Dry run only — no changes made.");
                    Console.WriteLine("Re-run with --confirm to delete the enrolls listed above.");
                    client.Disconnect();
                    return 0;
                }

                Console.WriteLine();
                Console.WriteLine("Deleting...");
                int deletedSlots = 0;
                int skippedSlots = 0;
                int failedSlots = 0;
                int deletedEnrolls = 0;
                foreach (int enroll in toDelete)
                {
                    bool anyDeleted = false;
                    // Prefer real biometric slots first; skip meta backups (>= 50).
                    var slots = new List<UserIdRecord>(slotsByEnroll[enroll]);
                    slots.Sort((a, b) => a.BackupNo.CompareTo(b.BackupNo));
                    foreach (var u in slots)
                    {
                        if (!BackupDecoder.IsDeletableBackup(u.BackupNo))
                        {
                            Console.WriteLine("  skip enroll={0} backup={1} ({2}) — meta/non-deletable",
                                u.EnrollNo, u.BackupNo, u.BackupLabel);
                            skippedSlots++;
                            continue;
                        }
                        Console.WriteLine("  delete enroll={0} backup={1} ({2})",
                            u.EnrollNo, u.BackupNo, u.BackupLabel);
                        try
                        {
                            client.DeleteEnrollData(u.EnrollNo, u.EMachineNo, u.BackupNo);
                            deletedSlots++;
                            anyDeleted = true;
                        }
                        catch (Exception ex)
                        {
                            failedSlots++;
                            Console.Error.WriteLine("  WARN: " + ex.Message);
                        }
                    }
                    if (anyDeleted) deletedEnrolls++;
                }

                Console.WriteLine("Done. Deleted {0} enroll(s), {1} slot(s). Skipped {2}, failed {3}.",
                    deletedEnrolls, deletedSlots, skippedSlots, failedSlots);
                if (failedSlots > 0)
                {
                    Console.Error.WriteLine("Some slots failed — re-run dry-run to see what remains.");
                    client.Disconnect();
                    return 3;
                }
                client.Disconnect();
                return 0;
            }
        }

        static HashSet<int> ParseKeepEnrollFile(string path)
        {
            var keep = new HashSet<int>();
            foreach (string rawLine in File.ReadAllLines(path))
            {
                string line = rawLine.Trim();
                if (line.Length == 0) continue;
                if (line.StartsWith("#", StringComparison.Ordinal)) continue;

                // Allow comma / whitespace separated IDs on one line.
                string[] parts = line.Split(new[] { ',', ';', ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string part in parts)
                {
                    string token = part.Trim();
                    if (token.Length == 0) continue;
                    int id;
                    if (!int.TryParse(token, NumberStyles.Integer, CultureInfo.InvariantCulture, out id))
                        throw new InvalidOperationException("Invalid enroll ID: \"" + token + "\"");
                    keep.Add(id);
                }
            }
            return keep;
        }

        static DeviceClient ConnectOrFail(DeviceSettings settings)
        {
            Console.WriteLine("Connecting to {0}:{1} (machine={2}) ...",
                settings.Ip, settings.Port, settings.MachineNumber);
            var client = new DeviceClient(settings);
            if (!client.Connect())
            {
                Console.Error.WriteLine("ConnectTcpip FAILED: " + client.LastErrorText());
                client.Dispose();
                return null;
            }
            return client;
        }

        static bool TryGetEnroll(Dictionary<string, string> options, out int enrollNo)
        {
            enrollNo = 0;
            string text = GetOpt(options, "enroll");
            if (string.IsNullOrWhiteSpace(text))
            {
                Console.Error.WriteLine("Required: --enroll N");
                return false;
            }
            enrollNo = int.Parse(text, CultureInfo.InvariantCulture);
            return true;
        }

        static bool TryGetBackup(Dictionary<string, string> options, out int backupNo)
        {
            backupNo = 0;
            string text = GetOpt(options, "backup");
            if (string.IsNullOrWhiteSpace(text))
            {
                Console.Error.WriteLine("Required: --backup N  (0-9=finger, 11=card, 15=password, 17=face; 10 maps to 15)");
                return false;
            }
            backupNo = int.Parse(text, CultureInfo.InvariantCulture);
            return true;
        }

        static DeviceSettings LoadSettings(Dictionary<string, string> options)
        {
            var settings = DeviceSettings.Defaults();

            string configPath = GetOpt(options, "config");
            if (string.IsNullOrWhiteSpace(configPath))
            {
                string besideExe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
                string besideCwd = Path.Combine(Directory.GetCurrentDirectory(), "config.json");
                if (File.Exists(besideExe)) configPath = besideExe;
                else if (File.Exists(besideCwd)) configPath = besideCwd;
            }

            if (!string.IsNullOrWhiteSpace(configPath) && File.Exists(configPath))
                ApplyJsonConfig(settings, configPath);

            // CLI overrides config
            string ip = GetOpt(options, "ip");
            if (!string.IsNullOrWhiteSpace(ip)) settings.Ip = ip;

            string port = GetOpt(options, "port");
            if (!string.IsNullOrWhiteSpace(port))
                settings.Port = int.Parse(port, CultureInfo.InvariantCulture);

            string machine = GetOpt(options, "machine");
            if (!string.IsNullOrWhiteSpace(machine))
                settings.MachineNumber = int.Parse(machine, CultureInfo.InvariantCulture);

            string password = GetOpt(options, "password");
            if (!string.IsNullOrWhiteSpace(password))
                settings.Password = int.Parse(password, CultureInfo.InvariantCulture);

            return settings;
        }

        /// <summary>
        /// Minimal JSON reader for our flat config (no external deps on .NET 4.0).
        /// Accepts {"machineNumber":1,"ip":"...","port":5005,"password":0}
        /// </summary>
        static void ApplyJsonConfig(DeviceSettings settings, string path)
        {
            string json = File.ReadAllText(path);
            // Prefer XML conversion via a tiny hand parse for reliability without Newtonsoft.
            // Use simple key extraction.
            string ip = ExtractJsonString(json, "ip");
            if (ip != null) settings.Ip = ip;

            int? machine = ExtractJsonInt(json, "machineNumber");
            if (machine.HasValue) settings.MachineNumber = machine.Value;

            int? port = ExtractJsonInt(json, "port");
            if (port.HasValue) settings.Port = port.Value;

            int? password = ExtractJsonInt(json, "password");
            if (password.HasValue) settings.Password = password.Value;

            Console.WriteLine("Loaded config: {0}", path);
        }

        static string ExtractJsonString(string json, string key)
        {
            string pattern = "\"" + key + "\"";
            int i = json.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (i < 0) return null;
            int colon = json.IndexOf(':', i + pattern.Length);
            if (colon < 0) return null;
            int q1 = json.IndexOf('"', colon + 1);
            if (q1 < 0) return null;
            int q2 = json.IndexOf('"', q1 + 1);
            if (q2 < 0) return null;
            return json.Substring(q1 + 1, q2 - q1 - 1);
        }

        static int? ExtractJsonInt(string json, string key)
        {
            string pattern = "\"" + key + "\"";
            int i = json.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (i < 0) return null;
            int colon = json.IndexOf(':', i + pattern.Length);
            if (colon < 0) return null;
            int start = colon + 1;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            int end = start;
            if (end < json.Length && json[end] == '-') end++;
            while (end < json.Length && char.IsDigit(json[end])) end++;
            if (end == start || (end == start + 1 && json[start] == '-')) return null;
            int value;
            if (int.TryParse(json.Substring(start, end - start), NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
                return value;
            return null;
        }

        static Dictionary<string, string> ParseOptions(string[] args, int startIndex)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = startIndex; i < args.Length; i++)
            {
                string a = args[i];
                if (!a.StartsWith("--", StringComparison.Ordinal))
                    continue;

                string key = a.Substring(2);
                if (i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal))
                {
                    map[key] = args[i + 1];
                    i++;
                }
                else
                {
                    map[key] = "true";
                }
            }
            return map;
        }

        static string GetOpt(Dictionary<string, string> options, string key)
        {
            string value;
            return options.TryGetValue(key, out value) ? value : null;
        }

        static bool HasFlag(Dictionary<string, string> options, string key)
        {
            string value;
            if (!options.TryGetValue(key, out value)) return false;
            if (string.Equals(value, "true", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(value, "1", StringComparison.OrdinalIgnoreCase)) return true;
            return !string.IsNullOrWhiteSpace(value);
        }

        static bool IsHelp(string arg)
        {
            return arg == "-h" || arg == "--help" || arg == "/?" ||
                   string.Equals(arg, "help", StringComparison.OrdinalIgnoreCase);
        }

        static void PrintUsage()
        {
            Console.WriteLine(@"AEMS Attendance Sync CLI — biometric attendance tool (Windows x86)

GLog (attendance punches):
  pull-logs / log-info / delete-logs

SLog (admin audit):
  pull-slogs / slog-info / delete-slogs

Users & enrollment:
  list-users [--names] [--out users.csv]
  get-name --enroll N
  set-name --enroll N --name ""Display Name""
  get-enroll --enroll N --backup B [--out template.bin]
  set-enroll --enroll N --backup B [--in template.bin] [--privilege 0] [--password-or-card V]
  delete-enroll --enroll N --backup B --confirm
  delete-enroll --enroll N --all-backups --confirm
  enable-user / disable-user --enroll N --backup B
  empty-enrolls --confirm
  keep-users --keep-file active-enrolls.txt
  keep-users --keep-file active-enrolls.txt --confirm

Backup numbers:
  0-9 = fingerprint, 11 = card, 15 = password (10 maps to 15), 17 = face
  14 = user timezone, 16 = department

Other:
  connect / self-test
");
        }
    }
}
