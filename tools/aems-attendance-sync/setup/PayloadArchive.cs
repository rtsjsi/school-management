using System;
using System.IO;
using System.Reflection;
using System.Text;

namespace AemsAttendanceSync.Setup
{
    /// <summary>
    /// Simple length-prefixed file archive embedded in Setup.exe.
    /// Format: int32 count; then for each file: int32 pathUtf8Len, path, int32 dataLen, data.
    /// </summary>
    public static class PayloadArchive
    {
        public const string ResourceName = "AemsAttendanceSync.Setup.payload.pack";

        public static bool HasEmbeddedPayload()
        {
            using (Stream s = OpenEmbedded())
                return s != null;
        }

        public static void ExtractTo(string destDir)
        {
            using (Stream s = OpenEmbedded())
            {
                if (s == null)
                    throw new InvalidOperationException(
                        "This Setup.exe has no embedded app payload. Rebuild with package-installer.ps1.");

                Directory.CreateDirectory(destDir);
                using (var br = new BinaryReader(s, Encoding.UTF8))
                {
                    int count = br.ReadInt32();
                    if (count < 0 || count > 10000)
                        throw new InvalidOperationException("Corrupt payload archive.");

                    for (int i = 0; i < count; i++)
                    {
                        int pathLen = br.ReadInt32();
                        if (pathLen <= 0 || pathLen > 4096)
                            throw new InvalidOperationException("Corrupt payload entry path.");
                        string relative = Encoding.UTF8.GetString(br.ReadBytes(pathLen));
                        relative = relative.Replace('/', Path.DirectorySeparatorChar).TrimStart('\\', '/');
                        if (relative.IndexOf("..", StringComparison.Ordinal) >= 0)
                            throw new InvalidOperationException("Invalid payload path: " + relative);

                        int dataLen = br.ReadInt32();
                        if (dataLen < 0 || dataLen > 200 * 1024 * 1024)
                            throw new InvalidOperationException("Corrupt payload entry size.");
                        byte[] data = br.ReadBytes(dataLen);
                        if (data.Length != dataLen)
                            throw new InvalidOperationException("Truncated payload archive.");

                        string dest = Path.Combine(destDir, relative);
                        // Preserve existing config.json on upgrade.
                        if (string.Equals(Path.GetFileName(dest), "config.json", StringComparison.OrdinalIgnoreCase)
                            && File.Exists(dest))
                            continue;

                        string parent = Path.GetDirectoryName(dest);
                        if (!string.IsNullOrEmpty(parent))
                            Directory.CreateDirectory(parent);

                        WriteFileWithRetry(dest, data);
                    }
                }
            }
        }

        static Stream OpenEmbedded()
        {
            return Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName);
        }

        static void WriteFileWithRetry(string dest, byte[] data)
        {
            Exception last = null;
            for (int attempt = 0; attempt < 6; attempt++)
            {
                try
                {
                    if (File.Exists(dest))
                    {
                        try { File.SetAttributes(dest, FileAttributes.Normal); } catch { }
                    }
                    File.WriteAllBytes(dest, data);
                    return;
                }
                catch (Exception ex)
                {
                    last = ex;
                    Installer.StopRunningApp();
                    System.Threading.Thread.Sleep(400);
                }
            }
            throw new InvalidOperationException(
                "Could not update \"" + Path.GetFileName(dest) + "\".\n" +
                "Close " + Installer.AppName + " (tray icon → Exit) and try Install again.\n\n" +
                (last != null ? last.Message : ""));
        }
    }
}
