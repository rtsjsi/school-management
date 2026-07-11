using System;
using System.Threading;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    static class TrayProgram
    {
        const string MutexName = "Local\\AEMSAttendanceSync.SingleInstance";
        const string ShowEventName = "Local\\AEMSAttendanceSync.ShowMain";

        static Mutex _mutex;

        [STAThread]
        static void Main()
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
                    MessageBox.Show(ex != null ? ex.Message : "Unexpected error",
                        "AEMS Attendance Sync", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch { }
            };
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);

            using (var showEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName))
            {
                var ctx = new TrayApplicationContext();
                StartShowWatcher(showEvent, ctx);
                try
                {
                    Application.Run(ctx);
                }
                finally
                {
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
    }
}
