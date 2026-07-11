using System;
using System.Globalization;
using System.IO;
using System.Text;

namespace AemsAttendanceSync
{
    /// <summary>
    /// User settings live under LocalAppData (writable without admin).
    /// Install-dir config.json is used only as read-only defaults on first run.
    /// </summary>
    public sealed class AppConfig
    {
        public const string AppFolderName = "AEMS Attendance Sync";

        public int MachineNumber { get; set; }
        public string Ip { get; set; }
        public int Port { get; set; }
        public int Password { get; set; }
        public int IntervalMinutes { get; set; }
        public bool PullAll { get; set; }
        public bool StartWithWindows { get; set; }
        public bool Configured { get; set; }

        public static string DataDir
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    AppFolderName);
            }
        }

        public static string ConfigPath
        {
            get { return Path.Combine(DataDir, "config.json"); }
        }

        public static string LogsDir
        {
            get { return Path.Combine(DataDir, "logs"); }
        }

        public static string InstallConfigPath
        {
            get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json"); }
        }

        public static AppConfig Defaults()
        {
            return new AppConfig
            {
                MachineNumber = 1,
                Ip = "192.168.68.59",
                Port = 5005,
                Password = 0,
                IntervalMinutes = 5,
                PullAll = false,
                StartWithWindows = true,
                Configured = false
            };
        }

        public DeviceSettings ToDeviceSettings()
        {
            return new DeviceSettings
            {
                MachineNumber = MachineNumber,
                Ip = Ip,
                Port = Port,
                Password = Password
            };
        }

        public static AppConfig Load()
        {
            var cfg = Defaults();

            // Prefer user profile config (writable).
            if (File.Exists(ConfigPath))
            {
                Apply(cfg, File.ReadAllText(ConfigPath));
                return cfg;
            }

            // First run: seed from install-dir defaults if present.
            if (File.Exists(InstallConfigPath))
            {
                try { Apply(cfg, File.ReadAllText(InstallConfigPath)); }
                catch { }
            }

            // One-time migrate if an older install wrote settings beside the EXE
            // and that folder is readable (may fail under Program Files — ignore).
            TryMigrateLegacyBesideExe(cfg);

            return cfg;
        }

        public void Save()
        {
            Directory.CreateDirectory(DataDir);
            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"machineNumber\": {0},\r\n", MachineNumber);
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"ip\": \"{0}\",\r\n", Escape(Ip));
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"port\": {0},\r\n", Port);
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"password\": {0},\r\n", Password);
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"intervalMinutes\": {0},\r\n", IntervalMinutes);
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"pullAll\": {0},\r\n", PullAll ? "true" : "false");
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"startWithWindows\": {0},\r\n", StartWithWindows ? "true" : "false");
            sb.AppendFormat(CultureInfo.InvariantCulture, "  \"configured\": {0}\r\n", Configured ? "true" : "false");
            sb.AppendLine("}");
            File.WriteAllText(ConfigPath, sb.ToString(), Encoding.UTF8);
        }

        static void TryMigrateLegacyBesideExe(AppConfig cfg)
        {
            try
            {
                string legacy = InstallConfigPath;
                if (!File.Exists(legacy)) return;
                // Only migrate if it looks like a saved (configured) install-dir config.
                string json = File.ReadAllText(legacy);
                bool? configured = ExtractBool(json, "configured");
                if (configured != true) return;
                Apply(cfg, json);
                cfg.Save();
            }
            catch
            {
                // Program Files may be read-only or locked — ignore.
            }
        }

        public static void Apply(AppConfig cfg, string json)
        {
            string ip = ExtractString(json, "ip");
            if (ip != null) cfg.Ip = ip;

            int? v;
            v = ExtractInt(json, "machineNumber"); if (v.HasValue) cfg.MachineNumber = v.Value;
            v = ExtractInt(json, "port"); if (v.HasValue) cfg.Port = v.Value;
            v = ExtractInt(json, "password"); if (v.HasValue) cfg.Password = v.Value;
            v = ExtractInt(json, "intervalMinutes"); if (v.HasValue) cfg.IntervalMinutes = Math.Max(1, v.Value);

            bool? b;
            b = ExtractBool(json, "pullAll"); if (b.HasValue) cfg.PullAll = b.Value;
            b = ExtractBool(json, "startWithWindows"); if (b.HasValue) cfg.StartWithWindows = b.Value;
            b = ExtractBool(json, "configured"); if (b.HasValue) cfg.Configured = b.Value;
        }

        static string Escape(string value)
        {
            if (value == null) return "";
            return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        static string ExtractString(string json, string key)
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

        static int? ExtractInt(string json, string key)
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
            if (end <= start) return null;
            int value;
            if (int.TryParse(json.Substring(start, end - start), NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
                return value;
            return null;
        }

        static bool? ExtractBool(string json, string key)
        {
            string pattern = "\"" + key + "\"";
            int i = json.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (i < 0) return null;
            int colon = json.IndexOf(':', i + pattern.Length);
            if (colon < 0) return null;
            string rest = json.Substring(colon + 1).TrimStart();
            if (rest.StartsWith("true", StringComparison.OrdinalIgnoreCase)) return true;
            if (rest.StartsWith("false", StringComparison.OrdinalIgnoreCase)) return false;
            return null;
        }
    }

    public static class StartupHelper
    {
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string AppName = "AEMSAttendanceSync";

        public static void Apply(bool enabled)
        {
            using (var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(RunKey, true))
            {
                if (key == null) return;
                if (enabled)
                {
                    string exe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AEMSAttendanceSync.exe");
                    key.SetValue(AppName, "\"" + exe + "\"");
                }
                else
                {
                    key.DeleteValue(AppName, false);
                }
            }
        }
    }
}
