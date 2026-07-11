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
                    if (!DeviceGate.TryRun(DoSync, 30000, out busy))
                        throw new InvalidOperationException(busy);
                }
                catch (Exception ex)
                {
                    _lastStatus = "Error: " + ex.Message;
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

        void DoSync()
        {
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

                _lastSyncAt = DateTime.Now;
                _lastCount = punches.Count;
                _lastStatus = "OK — " + punches.Count + " punch(es)";

                if (punches.Count > 0)
                {
                    try
                    {
                        _tray.ShowBalloonTip(3000, "AEMS Attendance Sync",
                            punches.Count + " punch(es) saved", ToolTipIcon.Info);
                    }
                    catch { }
                }
            }
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
            _main.AllowClose();
            if (_usersForm != null && !_usersForm.IsDisposed)
                _usersForm.Close();
            _tray.Visible = false;
            _tray.Dispose();
            if (_appIcon != null) _appIcon.Dispose();
            ExitThread();
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
