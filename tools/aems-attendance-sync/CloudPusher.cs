using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;

namespace AemsAttendanceSync
{
    /// <summary>
    /// POSTs punches to the school management app /api/attendance-sync (raw insert only).
    /// Uses HttpWebRequest for .NET Framework 4.0 compatibility.
    /// </summary>
    public static class CloudPusher
    {
        public sealed class PushResult
        {
            public bool Ok;
            public int StatusCode;
            public string Body;
            public string Error;
        }

        public static string PendingDir
        {
            get { return Path.Combine(AppConfig.DataDir, "pending_push"); }
        }

        public static PushResult Push(AppConfig config, IList<PunchRecord> punches)
        {
            if (config == null) throw new ArgumentNullException("config");
            if (punches == null) punches = new List<PunchRecord>();

            string url = BuildUrl(config.ApiBaseUrl);
            string json = BuildPayloadJson(config.MachineNumber, punches);
            return PostJson(url, config.ApiKey, json);
        }

        public static PushResult PushJsonFile(AppConfig config, string filePath)
        {
            string url = BuildUrl(config.ApiBaseUrl);
            string json = File.ReadAllText(filePath, Encoding.UTF8);
            return PostJson(url, config.ApiKey, json);
        }

        public static void SavePending(AppConfig config, IList<PunchRecord> punches)
        {
            Directory.CreateDirectory(PendingDir);
            string name = "pending_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff") + ".json";
            string path = Path.Combine(PendingDir, name);
            File.WriteAllText(path, BuildPayloadJson(config.MachineNumber, punches), Encoding.UTF8);
        }

        /// <summary>
        /// Retries pending JSON payloads. Deletes a file only after HTTP 2xx.
        /// </summary>
        public static int RetryPending(AppConfig config, out int failed)
        {
            failed = 0;
            if (!Directory.Exists(PendingDir)) return 0;

            string[] files = Directory.GetFiles(PendingDir, "pending_*.json");
            Array.Sort(files, StringComparer.OrdinalIgnoreCase);
            int ok = 0;
            foreach (string file in files)
            {
                try
                {
                    PushResult result = PushJsonFile(config, file);
                    if (result.Ok)
                    {
                        File.Delete(file);
                        ok++;
                        AppLog.Info("Pending push OK: " + Path.GetFileName(file));
                    }
                    else
                    {
                        failed++;
                        AppLog.Error(
                            "Pending push failed: " + Path.GetFileName(file) +
                            " HTTP " + result.StatusCode + " " + Truncate(result.Body ?? result.Error, 200));
                    }
                }
                catch (Exception ex)
                {
                    failed++;
                    AppLog.Error("Pending push exception: " + Path.GetFileName(file), ex);
                }
            }
            return ok;
        }

        static string BuildUrl(string apiBaseUrl)
        {
            string baseUrl = (apiBaseUrl ?? "").Trim().TrimEnd('/');
            if (string.IsNullOrEmpty(baseUrl))
                throw new InvalidOperationException("API base URL is not configured.");
            return baseUrl + "/api/attendance-sync";
        }

        static PushResult PostJson(string url, string apiKey, string json)
        {
            EnsureModernTls();

            var result = new PushResult();
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "POST";
                req.ContentType = "application/json; charset=utf-8";
                req.Accept = "application/json";
                req.Timeout = 60000;
                req.ReadWriteTimeout = 60000;
                req.UserAgent = "AEMSAttendanceSync/1.0";

                string key = (apiKey ?? "").Trim();
                if (!string.IsNullOrEmpty(key))
                    req.Headers["Authorization"] = "Bearer " + key;

                byte[] bytes = Encoding.UTF8.GetBytes(json ?? "{}");
                req.ContentLength = bytes.Length;
                using (Stream stream = req.GetRequestStream())
                {
                    stream.Write(bytes, 0, bytes.Length);
                }

                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    result.StatusCode = (int)resp.StatusCode;
                    result.Body = reader.ReadToEnd();
                    result.Ok = result.StatusCode >= 200 && result.StatusCode < 300;
                }
            }
            catch (WebException ex)
            {
                result.Ok = false;
                result.Error = ex.Message;
                if (ex.Response != null)
                {
                    try
                    {
                        var resp = (HttpWebResponse)ex.Response;
                        result.StatusCode = (int)resp.StatusCode;
                        using (var reader = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                            result.Body = reader.ReadToEnd();
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                result.Ok = false;
                result.Error = ex.Message;
            }
            return result;
        }

        /// <summary>
        /// .NET 4.0 defaults to SSL3/TLS1.0; Vercel (and most hosts) require TLS 1.2+.
        /// Tls12 = 3072 — cast because the enum member may be missing on older reference assemblies.
        /// </summary>
        static void EnsureModernTls()
        {
            try
            {
                const SecurityProtocolType tls12 = (SecurityProtocolType)3072;
                const SecurityProtocolType tls11 = (SecurityProtocolType)768;
                ServicePointManager.SecurityProtocol =
                    ServicePointManager.SecurityProtocol | tls12 | tls11;
                ServicePointManager.Expect100Continue = false;
            }
            catch { }
        }

        public static string BuildPayloadJson(int machineNo, IList<PunchRecord> punches)
        {
            var sb = new StringBuilder();
            sb.Append("{\"machineNo\":");
            sb.Append(machineNo.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"punches\":[");
            if (punches != null)
            {
                for (int i = 0; i < punches.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    AppendPunch(sb, punches[i]);
                }
            }
            sb.Append("]}");
            return sb.ToString();
        }

        static void AppendPunch(StringBuilder sb, PunchRecord p)
        {
            sb.Append("{\"enrollNo\":\"");
            sb.Append(Escape(p.EnrollNo.ToString(CultureInfo.InvariantCulture)));
            sb.Append("\",\"punchedAt\":\"");
            sb.Append(Escape(p.PunchedAtText));
            sb.Append("\",\"direction\":\"");
            sb.Append(Escape(p.Direction ?? ""));
            sb.Append("\",\"verifyMethod\":\"");
            sb.Append(Escape(p.VerifyMethod ?? ""));
            sb.Append("\",\"rawVerifyMode\":");
            sb.Append(p.RawVerifyMode.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"photoIndex\":");
            sb.Append(p.PhotoIndex.ToString(CultureInfo.InvariantCulture));
            sb.Append(",\"machineNo\":");
            sb.Append(p.MachineNo.ToString(CultureInfo.InvariantCulture));
            sb.Append("}");
        }

        static string Escape(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            return value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\t", "\\t");
        }

        static string Truncate(string s, int max)
        {
            if (string.IsNullOrEmpty(s)) return "";
            s = s.Replace("\r", " ").Replace("\n", " ");
            if (s.Length <= max) return s;
            return s.Substring(0, max) + "...";
        }
    }
}
