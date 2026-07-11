using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace AemsAttendanceSync
{
    public static class UserExporter
    {
        public static void WriteConsole(IList<UserIdRecord> users)
        {
            Console.WriteLine();
            Console.WriteLine(
                "{0,-8} {1,-6} {2,-14} {3,-6} {4,-8} {5,-6} {6}",
                "Enroll", "EMach", "Backup", "Priv", "Enabled", "Duress", "Name");
            Console.WriteLine(new string('-', 80));

            foreach (var u in users)
            {
                Console.WriteLine(
                    "{0,-8} {1,-6} {2,-14} {3,-6} {4,-8} {5,-6} {6}",
                    u.EnrollNo,
                    u.EMachineNo,
                    u.BackupNo + "-" + u.BackupLabel,
                    u.Privilege,
                    u.Enabled ? "Yes" : "No",
                    u.Duress,
                    u.Name ?? "");
            }

            Console.WriteLine();
            Console.WriteLine("Total slots: {0}", users.Count);
        }

        public static void WriteFile(IList<UserIdRecord> users, string path)
        {
            string ext = Path.GetExtension(path);
            if (string.Equals(ext, ".json", StringComparison.OrdinalIgnoreCase))
                WriteJson(users, path);
            else
                WriteCsv(users, path);
        }

        public static void WriteCsv(IList<UserIdRecord> users, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("enroll_no,emachine_no,backup_no,backup_label,privilege,enabled,duress,enable_raw,name");
            foreach (var u in users)
            {
                sb.Append(u.EnrollNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(u.EMachineNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(u.BackupNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(EscapeCsv(u.BackupLabel));
                sb.Append(',');
                sb.Append(u.Privilege.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(u.Enabled ? "1" : "0");
                sb.Append(',');
                sb.Append(u.Duress.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(u.EnableRaw.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(EscapeCsv(u.Name));
                sb.AppendLine();
            }
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
        }

        public static void WriteJson(IList<UserIdRecord> users, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("[");
            for (int i = 0; i < users.Count; i++)
            {
                var u = users[i];
                sb.Append("  {");
                sb.AppendFormat(CultureInfo.InvariantCulture,
                    "\"enroll_no\":{0},\"emachine_no\":{1},\"backup_no\":{2},\"backup_label\":\"{3}\",\"privilege\":{4},\"enabled\":{5},\"duress\":{6},\"enable_raw\":{7},\"name\":\"{8}\"",
                    u.EnrollNo,
                    u.EMachineNo,
                    u.BackupNo,
                    EscapeJson(u.BackupLabel),
                    u.Privilege,
                    u.Enabled ? "true" : "false",
                    u.Duress,
                    u.EnableRaw,
                    EscapeJson(u.Name));
                sb.Append("}");
                if (i < users.Count - 1) sb.Append(',');
                sb.AppendLine();
            }
            sb.AppendLine("]");
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
        }

        public static void WriteTemplateBin(EnrollTemplate template, string path)
        {
            if (template == null || template.TemplateInts == null)
                throw new ArgumentException("Template data is required.");

            using (var fs = File.Create(path))
            using (var bw = new BinaryWriter(fs))
            {
                for (int i = 0; i < template.TemplateInts.Length; i++)
                    bw.Write(template.TemplateInts[i]);
            }

            string metaPath = path + ".meta.txt";
            File.WriteAllText(metaPath,
                "enroll_no=" + template.EnrollNo + Environment.NewLine +
                "backup_no=" + template.BackupNo + Environment.NewLine +
                "backup_label=" + template.BackupLabel + Environment.NewLine +
                "privilege=" + template.Privilege + Environment.NewLine +
                "password_or_card=" + template.PasswordOrCard + Environment.NewLine +
                "int_count=" + template.TemplateInts.Length + Environment.NewLine,
                Encoding.UTF8);
        }

        public static int[] ReadTemplateBin(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            if (bytes.Length % 4 != 0)
                throw new InvalidOperationException("Template file length must be a multiple of 4 bytes.");

            int count = bytes.Length / 4;
            var ints = new int[Math.Max(count, BackupDecoder.MaxTemplateIntCount)];
            Buffer.BlockCopy(bytes, 0, ints, 0, bytes.Length);
            return ints;
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
