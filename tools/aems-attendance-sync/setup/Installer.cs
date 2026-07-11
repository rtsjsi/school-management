using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AemsAttendanceSync.Setup
{
    public static class Installer
    {
        public const string AppName = "AEMS Attendance Sync";
        public const string Publisher = "Angel English Medium School";
        public const string ExeName = "AEMSAttendanceSync.exe";
        public const string SetupExeName = "AEMSAttendanceSync-Setup.exe";
        public const string UninstallKeyName = "AEMSAttendanceSync";
        public const string StartupValueName = "AEMSAttendanceSync";
        public const string InstallFolderName = "AEMS Attendance Sync";
        public const string StartMenuFolderName = "AEMS Attendance Sync";

        public sealed class Options
        {
            public bool DesktopShortcut { get; set; }
            public bool StartMenuShortcut { get; set; }
            public bool StartWithWindows { get; set; }
        }

        public static string InstallDir
        {
            get
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                    InstallFolderName);
            }
        }

        public static string InstalledExe
        {
            get { return Path.Combine(InstallDir, ExeName); }
        }

        public static void Install(Options options)
        {
            if (!PayloadArchive.HasEmbeddedPayload())
                throw new InvalidOperationException(
                    "This Setup.exe has no embedded app. Rebuild with package-installer.ps1.");

            // Reinstall / upgrade: stop the running tray app so EXE/DLLs can be overwritten.
            StopRunningApp();

            Directory.CreateDirectory(InstallDir);
            PayloadArchive.ExtractTo(InstallDir);
            Directory.CreateDirectory(Path.Combine(InstallDir, "logs"));

            // Copy this Setup.exe into the install folder for Control Panel uninstall.
            string setupSrc = Application.ExecutablePath;
            string setupDst = Path.Combine(InstallDir, SetupExeName);
            if (File.Exists(setupSrc))
                CopyFileWithRetry(setupSrc, setupDst);

            string startMenuDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
                "Programs", StartMenuFolderName);
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);

            if (options.StartMenuShortcut)
            {
                Directory.CreateDirectory(startMenuDir);
                CreateShortcut(Path.Combine(startMenuDir, AppName + ".lnk"), InstalledExe, InstallDir,
                    "Pull attendance logs from biometric machine", null);
                CreateShortcut(Path.Combine(startMenuDir, "Uninstall " + AppName + ".lnk"),
                    setupDst, InstallDir, "Uninstall " + AppName, "/uninstall");
            }

            if (options.DesktopShortcut)
            {
                CreateShortcut(Path.Combine(desktopDir, AppName + ".lnk"), InstalledExe, InstallDir,
                    "Pull attendance logs from biometric machine", null);
            }

            SetStartup(options.StartWithWindows);
            WriteUninstallRegistry(setupDst);
        }

        /// <summary>
        /// Must match TrayProgram.ExitEventName in tray/TrayProgram.cs. Duplicated here
        /// (rather than referenced) because Setup and Tray are separate assemblies.
        /// </summary>
        const string ExitEventName = "Local\\AEMSAttendanceSync.RequestExit";

        /// <summary>
        /// Stop tray app process(es) so install files are not locked. Prefers asking a
        /// running instance to shut down cleanly (releases the biometric device session)
        /// and only falls back to a hard kill if it does not exit in time — a hard kill
        /// abandons any open device session and can cause ERR_NON_CARRYOUT on the next
        /// connect attempt.
        /// </summary>
        public static void StopRunningApp()
        {
            if (TryGracefulStop(5000))
                return;

            KillByName(Path.GetFileNameWithoutExtension(ExeName));
            System.Threading.Thread.Sleep(600);
            // Second pass in case a process was slow to exit.
            KillByName(Path.GetFileNameWithoutExtension(ExeName));
            System.Threading.Thread.Sleep(300);
        }

        /// <summary>Signals the running instance's exit watcher and waits for it to exit on its own.</summary>
        static bool TryGracefulStop(int timeoutMs)
        {
            string processName = Path.GetFileNameWithoutExtension(ExeName);
            if (Process.GetProcessesByName(processName).Length == 0)
                return true; // nothing running

            try
            {
                using (var ev = EventWaitHandle.OpenExisting(ExitEventName))
                    ev.Set();
            }
            catch
            {
                // No running instance listening (older build, or already gone) — caller falls back to Kill().
                return false;
            }

            int deadline = Environment.TickCount + timeoutMs;
            while (Environment.TickCount < deadline)
            {
                bool anyAlive = false;
                foreach (var p in Process.GetProcessesByName(processName))
                {
                    try { if (!p.HasExited) anyAlive = true; }
                    catch { anyAlive = true; }
                }
                if (!anyAlive) return true;
                Thread.Sleep(200);
            }
            return false;
        }

        public static void LaunchInstalledApp()
        {
            if (!File.Exists(InstalledExe)) return;
            Process.Start(new ProcessStartInfo(InstalledExe) { WorkingDirectory = InstallDir });
        }

        public static bool IsRunningFromInstallDir()
        {
            try
            {
                string exe = Path.GetFullPath(Application.ExecutablePath)
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                string dir = Path.GetFullPath(InstallDir)
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    + Path.DirectorySeparatorChar;
                return exe.StartsWith(dir, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Copy Setup to %TEMP% and run uninstall from there so Program Files can be deleted.
        /// </summary>
        public static void RelaunchUninstallFromTemp()
        {
            string src = Application.ExecutablePath;
            string tempDir = Path.Combine(Path.GetTempPath(), "AEMSAttendanceSync-Uninstall");
            Directory.CreateDirectory(tempDir);
            string dest = Path.Combine(tempDir, SetupExeName);
            File.Copy(src, dest, true);

            Process.Start(new ProcessStartInfo
            {
                FileName = dest,
                Arguments = "/uninstall /fromtemp",
                WorkingDirectory = tempDir,
                UseShellExecute = true
            });
        }

        public static void Uninstall()
        {
            SetStartup(false);

            TryDelete(Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory),
                AppName + ".lnk"));

            string startMenuDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
                "Programs", StartMenuFolderName);
            if (Directory.Exists(startMenuDir))
            {
                try { Directory.Delete(startMenuDir, true); } catch { }
            }

            // Stop tray app (and any leftover instances) before deleting files.
            StopRunningApp();

            if (Directory.Exists(InstallDir))
            {
                Exception last = null;
                for (int attempt = 0; attempt < 5; attempt++)
                {
                    try
                    {
                        DeleteDirectoryContents(InstallDir);
                        Directory.Delete(InstallDir, true);
                        last = null;
                        break;
                    }
                    catch (Exception ex)
                    {
                        last = ex;
                        System.Threading.Thread.Sleep(400);
                        KillByName(Path.GetFileNameWithoutExtension(ExeName));
                    }
                }

                if (last != null || Directory.Exists(InstallDir))
                {
                    throw new InvalidOperationException(
                        "Could not fully remove " + InstallDir + ".\n" +
                        "Close " + AppName + " (tray icon → Exit) and try again.\n\n" +
                        (last != null ? last.Message : "Folder still exists."));
                }
            }

            using (RegistryKey key = Registry.LocalMachine.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall", true))
            {
                if (key != null) key.DeleteSubKeyTree(UninstallKeyName, false);
            }
        }

        static void KillByName(string processName)
        {
            foreach (var p in Process.GetProcessesByName(processName))
            {
                try { p.Kill(); p.WaitForExit(3000); } catch { }
            }
        }

        static void DeleteDirectoryContents(string dir)
        {
            if (!Directory.Exists(dir)) return;
            foreach (string file in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
            {
                try
                {
                    File.SetAttributes(file, FileAttributes.Normal);
                    File.Delete(file);
                }
                catch { }
            }
            foreach (string sub in Directory.GetDirectories(dir))
            {
                try { Directory.Delete(sub, true); } catch { }
            }
        }

        static void WriteUninstallRegistry(string setupExe)
        {
            using (RegistryKey key = Registry.LocalMachine.CreateSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + UninstallKeyName))
            {
                if (key == null) return;
                key.SetValue("DisplayName", AppName);
                key.SetValue("Publisher", Publisher);
                key.SetValue("InstallLocation", InstallDir);
                key.SetValue("DisplayIcon", InstalledExe);
                key.SetValue("UninstallString", "\"" + setupExe + "\" /uninstall");
                key.SetValue("NoModify", 1);
                key.SetValue("NoRepair", 1);
                key.SetValue("EstimatedSize", DirSizeKb(InstallDir));
            }
        }

        static int DirSizeKb(string dir)
        {
            long bytes = 0;
            try
            {
                foreach (var f in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
                    bytes += new FileInfo(f).Length;
            }
            catch { }
            return (int)(bytes / 1024);
        }

        static void SetStartup(bool enabled)
        {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Run", true))
            {
                if (key == null) return;
                if (enabled)
                    key.SetValue(StartupValueName, "\"" + InstalledExe + "\"");
                else
                    key.DeleteValue(StartupValueName, false);
            }
        }

        static void CopyFileWithRetry(string source, string dest)
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
                    File.Copy(source, dest, true);
                    return;
                }
                catch (Exception ex)
                {
                    last = ex;
                    StopRunningApp();
                    System.Threading.Thread.Sleep(400);
                }
            }
            throw new InvalidOperationException(
                "Could not update \"" + Path.GetFileName(dest) + "\".\n" +
                "Close " + AppName + " (tray icon → Exit) and try Install again.\n\n" +
                (last != null ? last.Message : ""));
        }

        static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description, string arguments)
        {
            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            if (shellType == null)
                throw new InvalidOperationException("WScript.Shell is not available on this PC.");

            object shell = Activator.CreateInstance(shellType);
            object shortcut = shellType.InvokeMember(
                "CreateShortcut",
                BindingFlags.InvokeMethod,
                null,
                shell,
                new object[] { shortcutPath });

            Type shortcutType = shortcut.GetType();
            shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
            shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
            shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
            if (!string.IsNullOrEmpty(arguments))
                shortcutType.InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments });
            shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath + ",0" });
            shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
        }

        static void TryDelete(string path)
        {
            try { if (File.Exists(path)) File.Delete(path); } catch { }
        }
    }
}
