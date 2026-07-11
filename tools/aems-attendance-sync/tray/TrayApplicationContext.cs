using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    public sealed class TrayApplicationContext : ApplicationContext
    {
        readonly NotifyIcon _tray;
        readonly System.Windows.Forms.Timer _timer;
        readonly object _syncLock = new object();
        readonly Icon _appIcon;
        readonly MainForm _main;
        AppConfig _config;
        bool _syncing;
        string _lastStatus = "Starting...";
        DateTime? _lastSyncAt;
        int _lastCount;
        UsersForm _usersForm;

        public TrayApplicationContext()
        {
            _config = AppConfig.Load();
            Directory.CreateDirectory(AppConfig.LogsDir);
            _appIcon = LoadAppIcon();

            _main = new MainForm();
            if (_appIcon != null) _main.Icon = _appIcon;
            _main.Bind(
                () => _config,
                () => StartSync(true),
                ShowUsers,
                ShowSettings,
                OpenLogs);
            MainForm = _main;

            _tray = new NotifyIcon();
            _tray.Icon = _appIcon;
            _tray.Visible = true;
            _tray.Text = "AEMS Attendance Sync";
            _tray.ContextMenuStrip = BuildMenu();
            _tray.DoubleClick += (s, e) => ShowMain();

            _timer = new System.Windows.Forms.Timer();
            _timer.Tick += (s, e) => StartSync(false);

            _main.Show();
            _main.RefreshStatus(_config.Configured ? "Ready" : "Not configured");

            if (_config.Configured)
            {
                ApplyRuntime();
                StartSync(true);
            }
            else
            {
                UpdateTooltip("Not configured — open Settings");
            }
        }

        ContextMenuStrip BuildMenu()
        {
            var menu = new ContextMenuStrip();
            menu.Items.Add("Open", null, (s, e) => ShowMain());
            menu.Items.Add("Sync now", null, (s, e) => StartSync(true));
            menu.Items.Add("User management...", null, (s, e) => ShowUsers());
            menu.Items.Add("Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("Open logs folder", null, (s, e) => OpenLogs());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => ExitApp());
            return menu;
        }

        void ShowMain()
        {
            _main.ShowFromTray();
        }

        /// <summary>Called from another process launch (single-instance activate).</summary>
        public void RequestShowMain()
        {
            try
            {
                if (_main == null || _main.IsDisposed) return;
                if (_main.InvokeRequired)
                    _main.BeginInvoke(new Action(ShowMain));
                else
                    ShowMain();
            }
            catch { }
        }

        /// <summary>
        /// Called by the installer/uninstaller (via TrayProgram's exit watcher) to ask
        /// this instance to shut down cleanly instead of being killed. Must marshal to
        /// the UI thread since ExitApp touches WinForms controls.
        /// </summary>
        public void RequestExit()
        {
            try
            {
                if (_main == null || _main.IsDisposed) return;
                if (_main.InvokeRequired)
                    _main.BeginInvoke(new Action(ExitApp));
                else
                    ExitApp();
            }
            catch { }
        }

        void OpenLogs()
        {
            Directory.CreateDirectory(AppConfig.LogsDir);
            System.Diagnostics.Process.Start("explorer.exe", AppConfig.LogsDir);
        }

        void ShowUsers()
        {
            try
            {
                if (!_config.Configured)
                {
                    MessageBox.Show("Configure the device in Settings first.", "AEMS Attendance Sync",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    ShowSettings();
                    if (!_config.Configured) return;
                }

                if (_usersForm == null || _usersForm.IsDisposed)
                {
                    _usersForm = new UsersForm(_config);
                    if (_appIcon != null) _usersForm.Icon = _appIcon;
                    _usersForm.FormClosed += (s, e) => { _usersForm = null; };
                    _usersForm.Show(_main);
                }
                else
                {
                    _usersForm.WindowState = FormWindowState.Normal;
                    _usersForm.Activate();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open User management:\n" + ex.Message,
                    "AEMS Attendance Sync", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        void ShowSettings()
        {
            using (var form = new SettingsForm(_config))
            {
                if (_appIcon != null) form.Icon = _appIcon;
                if (form.ShowDialog(_main) != DialogResult.OK) return;
                _config = form.Result;
                try
                {
                    _config.Save();
                }
                catch (Exception ex)
                {
                    MessageBox.Show(_main,
                        "Could not save settings:\n" + ex.Message +
                        "\n\nSettings are stored in:\n" + AppConfig.ConfigPath,
                        "AEMS Attendance Sync", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                ApplyRuntime();
                _main.RefreshStatus("Ready");
                StartSync(true);
            }
        }

        void ApplyRuntime()
        {
            StartupHelper.Apply(_config.StartWithWindows);
            _timer.Stop();
            _timer.Interval = Math.Max(1, _config.IntervalMinutes) * 60 * 1000;
            _timer.Start();
            UpdateTooltip("Ready — every " + _config.IntervalMinutes + " min");
            _main.RefreshStatus("Ready — every " + _config.IntervalMinutes + " min");
        }

        void StartSync(bool manual)
        {
            if (!_config.Configured)
            {
                if (manual) ShowSettings();
                return;
            }

            if (UsersForm.DeviceSessionOpen)
            {
                string skip = "Sync paused while User management is open.";
                if (manual)
                {
                    MessageBox.Show(skip + "\nClose the Users window, then sync.",
                        "AEMS Attendance Sync", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    AppLog.Info("Scheduled sync skipped — User management is open");
                }
                UpdateTooltip(skip);
                _main.RefreshStatus(skip);
                return;
            }

            lock (_syncLock)
            {
                if (_syncing) return;
                _syncing = true;
            }

            string msg = manual ? "Syncing now..." : "Scheduled sync...";
            UpdateTooltip(msg);
            _main.RefreshStatus(msg);

            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    string busy;
                    if (!DeviceGate.TryRun(() => DoSync(manual), 30000, out busy))
                        throw new InvalidOperationException(busy);
                }
                catch (Exception ex)
                {
                    _lastStatus = "Error: " + ex.Message;
                    AppLog.Error((manual ? "Manual" : "Scheduled") + " sync failed", ex);
                    try
                    {
                        _tray.ShowBalloonTip(4000, "AEMS Attendance Sync", _lastStatus, ToolTipIcon.Error);
                    }
                    catch { }
                }
                finally
                {
                    lock (_syncLock) { _syncing = false; }
                    UpdateTooltip(BuildTooltip());
                    _main.SetLastSync(_lastSyncAt, _lastCount, _lastStatus);
                }
            });
        }

        void DoSync(bool manual)
        {
            // Retry any previously failed cloud pushes first (idempotent on server).
            if (_config.CanPushCloud)
            {
                int pendingFailed;
                int pendingOk = CloudPusher.RetryPending(_config, out pendingFailed);
                if (pendingOk > 0 || pendingFailed > 0)
                    AppLog.Info("Pending cloud retry: " + pendingOk + " ok, " + pendingFailed + " failed");
            }

            using (var client = new DeviceClient(_config.ToDeviceSettings()))
            {
                if (!client.Connect())
                    throw new InvalidOperationException("Connect failed: " + client.LastErrorText());

                List<PunchRecord> punches;
                try
                {
                    punches = client.PullGLogs(_config.PullAll);
                }
                finally
                {
                    client.Disconnect();
                }

                Directory.CreateDirectory(AppConfig.LogsDir);
                string file = Path.Combine(
                    AppConfig.LogsDir,
                    "glog_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".csv");
                PunchExporter.WriteCsv(punches, file);

                string cloudPart = "";
                if (_config.CanPushCloud && punches.Count > 0)
                {
                    var push = CloudPusher.Push(_config, punches);
                    if (push.Ok)
                    {
                        cloudPart = "; cloud OK";
                        AppLog.Info("Cloud push OK: " + punches.Count + " punch(es) → " + Truncate(push.Body, 180));
                    }
                    else
                    {
                        try { CloudPusher.SavePending(_config, punches); }
                        catch (Exception pendEx)
                        {
                            AppLog.Error("Failed to save pending cloud payload", pendEx);
                        }
                        cloudPart = "; cloud FAILED (queued)";
                        AppLog.Error(
                            "Cloud push failed HTTP " + push.StatusCode + " " +
                            Truncate(push.Body ?? push.Error, 200));
                    }
                }
                else if (_config.PushEnabled && !_config.CanPushCloud)
                {
                    cloudPart = "; cloud skipped (URL/key missing)";
                }

                _lastSyncAt = DateTime.Now;
                _lastCount = punches.Count;
                _lastStatus = "OK — " + punches.Count + " punch(es)" + cloudPart;

                if (manual)
                    AppLog.Info("Manual sync completed: " + punches.Count + " punch(es) → " + Path.GetFileName(file) + cloudPart);
                else
                    AppLog.Info("Scheduled sync completed: " + punches.Count + " punch(es) → " + Path.GetFileName(file) + cloudPart);

                if (punches.Count > 0)
                {
                    try
                    {
                        string tip = punches.Count + " punch(es) saved";
                        if (cloudPart.IndexOf("FAILED", StringComparison.Ordinal) >= 0)
                            tip += " (cloud queued)";
                        else if (cloudPart.IndexOf("cloud OK", StringComparison.Ordinal) >= 0)
                            tip += " + pushed";
                        _tray.ShowBalloonTip(3000, "AEMS Attendance Sync", tip, ToolTipIcon.Info);
                    }
                    catch { }
                }
            }
        }

        static string Truncate(string s, int max)
        {
            if (string.IsNullOrEmpty(s)) return "";
            s = s.Replace("\r", " ").Replace("\n", " ");
            if (s.Length <= max) return s;
            return s.Substring(0, max) + "...";
        }

        string BuildTooltip()
        {
            string when = _lastSyncAt.HasValue
                ? _lastSyncAt.Value.ToString("HH:mm:ss")
                : "never";
            string tip = "AEMS Attendance Sync\nLast: " + when + " (" + _lastCount + ")\n" + _lastStatus;
            if (tip.Length > 60) tip = tip.Substring(0, 60);
            return tip;
        }

        void UpdateTooltip(string text)
        {
            try
            {
                if (text.Length > 63) text = text.Substring(0, 63);
                _tray.Text = text;
            }
            catch { }
        }

        void ExitApp()
        {
            _timer.Stop();

            // Let an in-flight sync finish its own clean Disconnect rather than abandoning
            // it mid-session — an abrupt process exit while connected is exactly what
            // leaves the device thinking a session is still active (ERR_NON_CARRYOUT on
            // the next Connect).
            WaitForSyncToFinish(5000);

            if (_usersForm != null && !_usersForm.IsDisposed)
                _usersForm.Close();

            ReleaseDeviceSession();

            _main.AllowClose();
            _tray.Visible = false;
            _tray.Dispose();
            if (_appIcon != null) _appIcon.Dispose();
            ExitThread();
        }

        void WaitForSyncToFinish(int timeoutMs)
        {
            int deadline = Environment.TickCount + timeoutMs;
            while (Environment.TickCount < deadline)
            {
                lock (_syncLock)
                {
                    if (!_syncing) return;
                }
                Thread.Sleep(100);
            }
            AppLog.Info("Exit: gave up waiting for in-flight sync after " + timeoutMs + "ms");
        }

        /// <summary>
        /// Final safety net on quit — sends a clean disconnect to the device even if a
        /// DeviceClient.Dispose() somewhere above didn't run. Safe to call even when no
        /// session is open (ResetNativeSession swallows native errors).
        /// </summary>
        void ReleaseDeviceSession()
        {
            try
            {
                int machine = _config != null ? _config.ToDeviceSettings().MachineNumber : 1;
                string busy;
                DeviceGate.TryRun(() => DeviceClient.ResetNativeSession(machine), 3000, out busy);
            }
            catch { }
        }

        static Icon LoadAppIcon()
        {
            try
            {
                string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AEMSAttendanceSync.ico");
                if (File.Exists(icoPath))
                    return new Icon(icoPath);

                Icon associated = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (associated != null) return associated;
            }
            catch { }
            return (Icon)SystemIcons.Application.Clone();
        }
    }
}
