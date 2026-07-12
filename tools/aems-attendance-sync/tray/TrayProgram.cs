using System;
using System.Threading;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    static class TrayProgram
    {
        const string MutexName = "Local\\AEMSAttendanceSync.SingleInstance";
        const string ShowEventName = "Local\\AEMSAttendanceSync.ShowMain";

        /// <summary>
        /// Signaled by the installer/uninstaller to ask a running instance to shut down
        /// cleanly (release the device session) instead of being killed outright. Name
        /// must match Installer.ExitEventName in setup/Installer.cs.
        /// </summary>
        internal const string ExitEventName = "Local\\AEMSAttendanceSync.RequestExit";

        static Mutex _mutex;

        [STAThread]
        static void Main(string[] args)
        {
            bool createdNew;
            try
            {
                _mutex = new Mutex(true, MutexName, out createdNew);
            }
            catch
            {
                createdNew = true;
            }

            if (!createdNew)
            {
                // Already running — ask the existing instance to show its window.
                try
                {
                    using (var ev = EventWaitHandle.OpenExisting(ShowEventName))
                        ev.Set();
                }
                catch { }
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.ThreadException += (s, e) =>
            {
                try
                {
                    AppLog.Crash("UI thread exception", e.Exception);
                    MessageBox.Show(e.Exception.Message, "AEMS Attendance Sync",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch { }
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                try
                {
                    var ex = e.ExceptionObject as Exception;
                    AppLog.Crash("Unhandled exception (terminating=" + e.IsTerminating + ")", ex);
                    MessageBox.Show(ex != null ? ex.Message : "Unexpected error",
                        "AEMS Attendance Sync", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch { }
            };
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);

            AppLog.Info("AEMS Attendance Sync started");

            using (var showEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName))
            using (var exitEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ExitEventName))
            {
                bool silent = args.Length > 0 && args[0].ToLowerInvariant() == "-silent";
                var ctx = new TrayApplicationContext(silent);
                StartShowWatcher(showEvent, ctx);
                StartExitWatcher(exitEvent, ctx);
                try
                {
                    Application.Run(ctx);
                }
                finally
                {
                    AppLog.Info("AEMS Attendance Sync exiting");
                    try { if (_mutex != null) _mutex.ReleaseMutex(); } catch { }
                    if (_mutex != null) _mutex.Dispose();
                }
            }
        }

        static void StartShowWatcher(EventWaitHandle showEvent, TrayApplicationContext ctx)
        {
            var thread = new Thread(() =>
            {
                try
                {
                    while (true)
                    {
                        showEvent.WaitOne();
                        try { ctx.RequestShowMain(); }
                        catch { }
                    }
                }
                catch (ThreadAbortException) { }
                catch { }
            });
            thread.IsBackground = true;
            thread.Name = "AEMS-ShowWatcher";
            thread.Start();
        }

        /// <summary>
        /// Lets an external process (installer/uninstaller) ask this instance to shut
        /// down cleanly — releases the device session before exiting — instead of being
        /// killed. One-shot: once an exit is requested, the process is going away.
        /// </summary>
        static void StartExitWatcher(EventWaitHandle exitEvent, TrayApplicationContext ctx)
        {
            var thread = new Thread(() =>
            {
                try
                {
                    exitEvent.WaitOne();
                    AppLog.Info("Graceful exit requested (installer/uninstaller)");
                    try { ctx.RequestExit(); }
                    catch { }
                }
                catch (ThreadAbortException) { }
                catch { }
            });
            thread.IsBackground = true;
            thread.Name = "AEMS-ExitWatcher";
            thread.Start();
        }
    }
}
