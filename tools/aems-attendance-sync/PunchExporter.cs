using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace AemsAttendanceSync
{
    public static class PunchExporter
    {
        public static void WriteConsole(IList<PunchRecord> punches)
        {
            Console.WriteLine();
            Console.WriteLine(
                "{0,-10} {1,-20} {2,-8} {3,-16} {4,-8} {5}",
                "EnrollNo", "PunchedAt", "Dir", "Verify", "Machine", "RawMode");
            Console.WriteLine(new string('-', 78));

            foreach (var p in punches)
            {
                Console.WriteLine(
                    "{0,-10} {1,-20} {2,-8} {3,-16} {4,-8} {5}",
                    p.EnrollNo,
                    p.PunchedAtText,
                    p.Direction,
                    p.VerifyMethod,
                    p.MachineNo,
                    p.RawVerifyMode);
            }

            Console.WriteLine();
            Console.WriteLine("Total: {0}", punches.Count);
        }

        public static void WriteFile(IList<PunchRecord> punches, string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Output path is required.", "path");

            string ext = Path.GetExtension(path);
            if (string.Equals(ext, ".json", StringComparison.OrdinalIgnoreCase))
                WriteJson(punches, path);
            else
                WriteCsv(punches, path);
        }

        public static void WriteCsv(IList<PunchRecord> punches, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("enroll_no,punched_at,direction,verify_method,machine_no,raw_verify_mode,photo_index");
            foreach (var p in punches)
            {
                sb.Append(p.EnrollNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(EscapeCsv(p.PunchedAtText));
                sb.Append(',');
                sb.Append(EscapeCsv(p.Direction));
                sb.Append(',');
                sb.Append(EscapeCsv(p.VerifyMethod));
                sb.Append(',');
                sb.Append(p.MachineNo.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(p.RawVerifyMode.ToString(CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(p.PhotoIndex.ToString(CultureInfo.InvariantCulture));
                sb.AppendLine();
            }
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
        }

        public static void WriteJson(IList<PunchRecord> punches, string path)
        {
            var sb = new StringBuilder();
            sb.AppendLine("[");
            for (int i = 0; i < punches.Count; i++)
            {
                var p = punches[i];
                sb.Append("  {");
                sb.AppendFormat(CultureInfo.InvariantCulture,
                    "\"enroll_no\":{0},\"punched_at\":\"{1}\",\"direction\":\"{2}\",\"verify_method\":\"{3}\",\"machine_no\":{4},\"raw_verify_mode\":{5},\"photo_index\":{6}",
                    p.EnrollNo,
                    EscapeJson(p.PunchedAtText),
                    EscapeJson(p.Direction),
                    EscapeJson(p.VerifyMethod),
                    p.MachineNo,
                    p.RawVerifyMode,
                    p.PhotoIndex);
                sb.Append("}");
                if (i < punches.Count - 1) sb.Append(',');
                sb.AppendLine();
            }
            sb.AppendLine("]");
            File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
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
