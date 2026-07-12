using System;
using System.Drawing;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    /// <summary>
    /// Primary window: status, sync, and shortcuts to Users / Settings.
    /// Closing hides to tray; Exit from tray fully quits.
    /// </summary>
    public sealed class MainForm : Form
    {
        readonly Label _title = new Label();
        readonly Label _indicator = new Label();
        readonly Label _device = new Label();
        readonly Label _lastSync = new Label();
        readonly Label _status = new Label();
        readonly Button _sync = new Button();
        readonly Button _users = new Button();
        readonly Button _settings = new Button();
        readonly Button _logs = new Button();
        readonly Button _hide = new Button();

        Func<AppConfig> _getConfig;
        Action _syncNow;
        Action _showUsers;
        Action _showSettings;
        Action _openLogs;
        bool _allowClose;

        public MainForm()
        {
            Text = "AEMS Attendance Sync";
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            MinimizeBox = true;
            ClientSize = new Size(480, 340);
            Font = new Font("Segoe UI", 9F);
            BackColor = Color.White;
            ShowInTaskbar = true;

            _title.Text = "AEMS Attendance Sync";
            _title.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
            _title.ForeColor = Color.FromArgb(20, 60, 110);
            _title.SetBounds(24, 20, 430, 28);
            Controls.Add(_title);

            var subtitle = new Label();
            subtitle.Text = "Biometric attendance bridge for school PCs";
            subtitle.ForeColor = Color.DimGray;
            subtitle.SetBounds(24, 50, 430, 20);
            Controls.Add(subtitle);

            var card = new Panel();
            card.SetBounds(24, 84, 432, 120);
            card.BackColor = Color.FromArgb(245, 248, 252);
            card.Padding = new Padding(12);
            Controls.Add(card);

            _device.Text = "Device: not configured";
            _device.SetBounds(16, 12, 400, 20);
            card.Controls.Add(_device);

            _indicator.Text = "Connection: Unknown";
            _indicator.SetBounds(16, 36, 400, 20);
            card.Controls.Add(_indicator);

            _lastSync.Text = "Last sync: never";
            _lastSync.SetBounds(16, 60, 400, 20);
            card.Controls.Add(_lastSync);

            _status.Text = "Status: idle";
            _status.SetBounds(16, 84, 400, 20);
            _status.ForeColor = Color.FromArgb(40, 40, 40);
            card.Controls.Add(_status);

            _sync.Text = "Sync now";
            _sync.SetBounds(24, 220, 100, 32);
            _sync.Click += (s, e) => { if (_syncNow != null) _syncNow(); };
            Controls.Add(_sync);

            _users.Text = "Users";
            _users.SetBounds(134, 220, 100, 32);
            _users.Click += (s, e) => { if (_showUsers != null) _showUsers(); };
            Controls.Add(_users);

            _settings.Text = "Settings";
            _settings.SetBounds(244, 220, 100, 32);
            _settings.Click += (s, e) => { if (_showSettings != null) _showSettings(); };
            Controls.Add(_settings);

            _logs.Text = "Logs";
            _logs.SetBounds(354, 220, 100, 32);
            _logs.Click += (s, e) => { if (_openLogs != null) _openLogs(); };
            Controls.Add(_logs);

            _hide.Text = "Minimize to tray";
            _hide.SetBounds(24, 270, 140, 28);
            _hide.Click += (s, e) => HideToTray();
            Controls.Add(_hide);

            var tip = new Label();
            tip.Text = "The app keeps running in the system tray after you close this window.";
            tip.ForeColor = Color.Gray;
            tip.SetBounds(170, 274, 280, 28);
            Controls.Add(tip);

            FormClosing += OnFormClosing;
        }

        public void Bind(
            Func<AppConfig> getConfig,
            Action syncNow,
            Action showUsers,
            Action showSettings,
            Action openLogs)
        {
            _getConfig = getConfig;
            _syncNow = syncNow;
            _showUsers = showUsers;
            _showSettings = showSettings;
            _openLogs = openLogs;
            RefreshStatus("Ready");
        }

        public void RefreshStatus(string statusText)
        {
            if (IsDisposed) return;
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => RefreshStatus(statusText)));
                return;
            }

            AppConfig cfg = _getConfig != null ? _getConfig() : null;
            if (cfg == null || !cfg.Configured)
            {
                _indicator.Text = "Connection: Not Configured";
                _indicator.ForeColor = Color.DarkOrange;
                _device.Text = "Device: not configured — open Settings";
                _lastSync.Text = "Last sync: —";
                _status.Text = "Status: waiting for setup";
                _status.ForeColor = Color.DarkOrange;
                return;
            }

            _device.Text = string.Format("Device: {0}:{1}  (machine {2})",
                cfg.Ip, cfg.Port, cfg.MachineNumber);
            _status.Text = "Status: " + (statusText ?? "idle");
            _status.ForeColor = Color.FromArgb(40, 40, 40);
            
            if (_indicator.Text == "Connection: Unknown" || _indicator.Text == "Connection: Not Configured" || _indicator.Text == "")
            {
                _indicator.Text = "Connection: Ready";
                _indicator.ForeColor = Color.DarkGreen;
            }
        }

        public void SetLastSync(DateTime? when, int count, string detail)
        {
            if (IsDisposed) return;
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => SetLastSync(when, count, detail)));
                return;
            }

            AppConfig cfg = _getConfig != null ? _getConfig() : null;
            if (cfg != null && cfg.Configured)
            {
                _device.Text = string.Format("Device: {0}:{1}  (machine {2})", cfg.Ip, cfg.Port, cfg.MachineNumber);
            }

            if (!when.HasValue)
                _lastSync.Text = "Last sync: never";
            else
                _lastSync.Text = string.Format("Last sync: {0:g}  ({1} punch(es))", when.Value, count);

            if (!string.IsNullOrEmpty(detail))
            {
                _status.Text = "Status: " + detail;
                bool isError = detail.StartsWith("Error", StringComparison.OrdinalIgnoreCase);
                _status.ForeColor = isError ? Color.Firebrick : Color.FromArgb(40, 40, 40);
                
                _indicator.Text = isError ? "Connection: Error" : "Connection: OK";
                _indicator.ForeColor = isError ? Color.Firebrick : Color.DarkGreen;
            }
        }

        public void ShowFromTray()
        {
            if (IsDisposed) return;
            Show();
            WindowState = FormWindowState.Normal;
            Activate();
            RefreshStatus(_status.Text.StartsWith("Status: ")
                ? _status.Text.Substring(8)
                : "Ready");
        }

        public void AllowClose()
        {
            _allowClose = true;
        }

        void HideToTray()
        {
            Hide();
        }

        void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (_allowClose) return;
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                HideToTray();
            }
        }
    }
}
