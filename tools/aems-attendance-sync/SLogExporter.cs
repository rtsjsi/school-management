using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace AemsAttendanceSync
{
    public static class SLogExporter
    {
        public static void WriteConsole(IList<SLogRecord> logs)
        {
            Console.WriteLine();
            Console.WriteLine(
                "{0,-8} {1,-8} {2,-8} {3,-8} {4,-22} {5,-12} {6,-20}",
                "Admin", "AMach", "Target", "TMach", "Action", "Media", "LoggedAt");
            Console.WriteLine(new string('-', 96));

            foreach (var s in logs)
            {
                Console.WriteLine(
                    "{0,-8} {1,-8} {2,-8} {3,-8} {4,-22} {5,-12} {6,-20}",
                    s.AdminEnrollNo,
                    s.AdminMachineNo,
                    s.TargetEnrollNo,
                    s.TargetMachineNo,
                    Truncate(s.ManipulationCode + "-" + s.Manipulation, 22),
                    s.FingerOrMedia,
                    s.LoggedAtText);
            }

            Console.WriteLine();
            Console.WriteLine("Total: {0}", logs.Count);
        }

        public static void WriteFile(IList<SLogRecord> logs, string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Output path is required.", "path");

            string ext = Path.GetExtension(path);
            if (string.Equals(ext, ".json", StringComparison.OrdinalIgnoreCase))
                WriteJson(logs, path);
            else
                WriteCsv(logs, path);
        }

        public static void WriteCsv(IList<SLogRecord> logs, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("admin_enroll_no,admin_machine_no,target_enroll_no,target_machine_no,manipulation_code,manipulation,backup_no,finger_or_media,logged_at,photo_or_tmachine");
            foreach (var s in logs)
            {
                sb.Append(s.AdminEnrollNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(s.AdminMachineNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(s.TargetEnrollNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(s.TargetMachineNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(s.ManipulationCode.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(EscapeCsv(s.Manipulation));
                sb.Append(',');
                sb.Append(s.BackupNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(EscapeCsv(s.FingerOrMedia));
                sb.Append(',');
                sb.Append(EscapeCsv(s.LoggedAtText));
                sb.Append(',');
                sb.Append(s.PhotoOrTMachine.ToString(CultureInfo.InvariantCulture));
                sb.AppendLine();
            }
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
        }

        public static void WriteJson(IList<SLogRecord> logs, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("[");
            for (int i = 0; i < logs.Count; i++)
            {
                var s = logs[i];
                sb.Append("  {");
                sb.AppendFormat(CultureInfo.InvariantCulture,
                    "\"admin_enroll_no\":{0},\"admin_machine_no\":{1},\"target_enroll_no\":{2},\"target_machine_no\":{3},\"manipulation_code\":{4},\"manipulation\":\"{5}\",\"backup_no\":{6},\"finger_or_media\":\"{7}\",\"logged_at\":\"{8}\",\"photo_or_tmachine\":{9}",
                    s.AdminEnrollNo,
                    s.AdminMachineNo,
                    s.TargetEnrollNo,
                    s.TargetMachineNo,
                    s.ManipulationCode,
                    EscapeJson(s.Manipulation),
                    s.BackupNo,
                    EscapeJson(s.FingerOrMedia),
                    EscapeJson(s.LoggedAtText),
                    s.PhotoOrTMachine);
                sb.Append("}");
                if (i < logs.Count - 1) sb.Append(',');
                sb.AppendLine();
            }
            sb.AppendLine("]");
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
        }

        private static string Truncate(string value, int max)
        {
            if (value == null) return "";
            return value.Length <= max ? value : value.Substring(0, max - 1) + "…";
        }

        private static string EscapeCsv(string value)
        {
            if (value == null) return "";
            if (value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0)
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            return value;
        }

        private static string EscapeJson(string value)
        {
            if (value == null) return "";
            return value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n");
        }
    }
}
