using System;
using System.IO;
using System.Text;

namespace AemsAttendanceSync
{
    /// <summary>
    /// Append-only daily application log under LocalAppData\...\logs\app-yyyyMMdd.log
    /// </summary>
    public static class AppLog
    {
        static readonly object Gate = new object();

        public static string TodayFilePath
        {
            get
            {
                return Path.Combine(
                    AppConfig.LogsDir,
                    "app-" + DateTime.Now.ToString("yyyyMMdd") + ".log");
            }
        }

        public static void Info(string message)
        {
            Write("INFO", message, null);
        }

        public static void Error(string message)
        {
            Write("ERROR", message, null);
        }

        public static void Error(string message, Exception ex)
        {
            Write("ERROR", message, ex);
        }

        public static void Crash(string message, Exception ex)
        {
            Write("CRASH", message, ex);
        }

        static void Write(string level, string message, Exception ex)
        {
            if (string.IsNullOrEmpty(message) && ex == null) return;

            try
            {
                var line = new StringBuilder();
                line.Append(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"));
                line.Append(" [");
                line.Append(level);
                line.Append("] ");
                line.Append(message ?? "");
                if (ex != null)
                {
                    line.Append(" | ");
                    line.Append(ex.GetType().FullName);
                    line.Append(": ");
                    line.Append(ex.Message);
                    if (ex.InnerException != null)
                    {
                        line.Append(" → ");
                        line.Append(ex.InnerException.Message);
                    }
                    line.Append(Environment.NewLine);
                    line.Append(ex.StackTrace);
                }

                lock (Gate)
                {
                    Directory.CreateDirectory(AppConfig.LogsDir);
                    File.AppendAllText(TodayFilePath, line.ToString() + Environment.NewLine, Encoding.UTF8);
                }
            }
            catch
            {
                // Logging must never take down the app.
            }
        }
    }
}
