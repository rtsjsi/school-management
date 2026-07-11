using System;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    public sealed class SettingsForm : Form
    {
        readonly TextBox _ip = new TextBox();
        readonly NumericUpDown _port = new NumericUpDown();
        readonly NumericUpDown _machine = new NumericUpDown();
        readonly NumericUpDown _password = new NumericUpDown();
        readonly NumericUpDown _interval = new NumericUpDown();
        readonly CheckBox _pullAll = new CheckBox();
        readonly CheckBox _startWithWindows = new CheckBox();
        readonly TextBox _apiBaseUrl = new TextBox();
        readonly TextBox _apiKey = new TextBox();
        readonly CheckBox _pushEnabled = new CheckBox();
        readonly Button _save = new Button();
        readonly Button _testDevice = new Button();
        readonly Button _testCloud = new Button();
        readonly Label _status = new Label();

        public AppConfig Result { get; private set; }

        public SettingsForm(AppConfig cfg)
        {
            Result = cfg;
            Text = "AEMS Attendance Sync — Settings";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(480, 500);
            Font = new Font("Segoe UI", 9F);

            int y = 16;
            AddLabel("Device IP", 16, y); _ip.SetBounds(160, y - 2, 290, 24); _ip.Text = cfg.Ip ?? ""; Controls.Add(_ip); y += 36;
            AddLabel("Port", 16, y); _port.SetBounds(160, y - 2, 100, 24); _port.Minimum = 1; _port.Maximum = 65535; _port.Value = Clamp(cfg.Port, 1, 65535); Controls.Add(_port); y += 36;
            AddLabel("Machine number", 16, y); _machine.SetBounds(160, y - 2, 100, 24); _machine.Minimum = 1; _machine.Maximum = 999; _machine.Value = Clamp(cfg.MachineNumber, 1, 999); Controls.Add(_machine); y += 36;
            AddLabel("Comm password", 16, y); _password.SetBounds(160, y - 2, 100, 24); _password.Minimum = 0; _password.Maximum = 999999; _password.Value = Clamp(cfg.Password, 0, 999999); Controls.Add(_password); y += 36;
            AddLabel("Pull every (minutes)", 16, y); _interval.SetBounds(160, y - 2, 100, 24); _interval.Minimum = 1; _interval.Maximum = 1440; _interval.Value = Clamp(cfg.IntervalMinutes <= 0 ? 5 : cfg.IntervalMinutes, 1, 1440); Controls.Add(_interval); y += 36;

            _pullAll.Text = "Download all logs each time (slower; default is new/unread only)";
            _pullAll.SetBounds(16, y, 440, 24);
            _pullAll.Checked = cfg.PullAll;
            Controls.Add(_pullAll);
            y += 28;

            _startWithWindows.Text = "Start automatically when Windows starts";
            _startWithWindows.SetBounds(16, y, 440, 24);
            _startWithWindows.Checked = cfg.StartWithWindows;
            Controls.Add(_startWithWindows);
            y += 36;

            AddLabel("School app URL", 16, y);
            _apiBaseUrl.SetBounds(160, y - 2, 290, 24);
            _apiBaseUrl.Text = cfg.ApiBaseUrl ?? "";
            Controls.Add(_apiBaseUrl);
            y += 36;

            AddLabel("API key", 16, y);
            _apiKey.SetBounds(160, y - 2, 290, 24);
            _apiKey.UseSystemPasswordChar = true;
            _apiKey.Text = cfg.ApiKey ?? "";
            Controls.Add(_apiKey);
            y += 32;

            _pushEnabled.Text = "Push punches to school management app after each sync";
            _pushEnabled.SetBounds(16, y, 440, 24);
            _pushEnabled.Checked = cfg.PushEnabled;
            Controls.Add(_pushEnabled);
            y += 36;

            _testDevice.Text = "Test device";
            _testDevice.SetBounds(16, y, 100, 30);
            _testDevice.Click += TestDeviceClick;
            Controls.Add(_testDevice);

            _testCloud.Text = "Test cloud";
            _testCloud.SetBounds(124, y, 100, 30);
            _testCloud.Click += TestCloudClick;
            Controls.Add(_testCloud);

            _save.Text = "Save & Start";
            _save.SetBounds(340, y, 110, 30);
            _save.Click += SaveClick;
            Controls.Add(_save);
            y += 40;

            _status.SetBounds(16, y, 440, 48);
            _status.ForeColor = Color.DimGray;
            Controls.Add(_status);
        }

        void AddLabel(string text, int x, int y)
        {
            var lbl = new Label();
            lbl.Text = text;
            lbl.SetBounds(x, y, 140, 22);
            Controls.Add(lbl);
        }

        static decimal Clamp(int value, int min, int max)
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }

        void TestDeviceClick(object sender, EventArgs e)
        {
            _status.Text = "Testing biometric device...";
            _status.ForeColor = Color.DimGray;
            Application.DoEvents();
            try
            {
                var settings = new DeviceSettings
                {
                    Ip = _ip.Text.Trim(),
                    Port = (int)_port.Value,
                    MachineNumber = (int)_machine.Value,
                    Password = (int)_password.Value
                };

                bool ok = false;
                string failDetail = null;
                string busy;
                if (!DeviceGate.TryRun(() =>
                {
                    // Clear any leftover native session from Sync so Test does not hit ERR_NON_CARRYOUT.
                    DeviceClient.ResetNativeSession(settings.MachineNumber);
                    Thread.Sleep(250);

                    using (var client = new DeviceClient(settings))
                    {
                        if (!client.Connect())
                        {
                            failDetail = client.LastErrorText();
                            ok = false;
                            return;
                        }
                        client.Disconnect();
                        ok = true;
                    }
                }, 15000, out busy))
                {
                    _status.ForeColor = Color.Firebrick;
                    _status.Text = "Device: " + (busy ?? "busy");
                    return;
                }

                if (!ok)
                {
                    _status.ForeColor = Color.Firebrick;
                    _status.Text = "Device failed: " + (failDetail ?? "connect rejected");
                    return;
                }

                _status.ForeColor = Color.DarkGreen;
                _status.Text = "Device OK. You can Save & Start.";
            }
            catch (Exception ex)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Device: " + ex.Message;
            }
        }

        void TestCloudClick(object sender, EventArgs e)
        {
            string url = _apiBaseUrl.Text.Trim().TrimEnd('/');
            string key = _apiKey.Text.Trim();

            if (string.IsNullOrWhiteSpace(url))
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Enter the full School app URL first.";
                return;
            }
            if (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                && !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "URL must start with https:// (full Vercel URL).";
                return;
            }
            if (url.IndexOf('.') < 0)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "URL looks incomplete. Paste the full host, e.g. https://….vercel.app";
                return;
            }
            if (string.IsNullOrWhiteSpace(key))
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Enter the API key (same as ATTENDANCE_SYNC_API_KEY on the server).";
                return;
            }

            _status.Text = "Testing cloud API...";
            _status.ForeColor = Color.DimGray;
            Application.DoEvents();

            try
            {
                var cfg = new AppConfig
                {
                    ApiBaseUrl = url,
                    ApiKey = key,
                    MachineNumber = (int)_machine.Value,
                    PushEnabled = true
                };
                // Empty batch is a valid auth + route smoke test.
                var result = CloudPusher.Push(cfg, new System.Collections.Generic.List<PunchRecord>());
                if (result.Ok)
                {
                    _status.ForeColor = Color.DarkGreen;
                    _status.Text = "Cloud OK — API accepted the request.";
                }
                else
                {
                    _status.ForeColor = Color.Firebrick;
                    string detail = result.Body;
                    if (string.IsNullOrEmpty(detail)) detail = result.Error;
                    if (detail != null && detail.Length > 120) detail = detail.Substring(0, 120) + "...";
                    _status.Text = "Cloud failed HTTP " + result.StatusCode + ": " + detail;
                }
            }
            catch (Exception ex)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Cloud: " + ex.Message;
            }
        }

        void SaveClick(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_ip.Text))
            {
                MessageBox.Show(this, "Enter the device IP address.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (_pushEnabled.Checked)
            {
                if (string.IsNullOrWhiteSpace(_apiBaseUrl.Text))
                {
                    MessageBox.Show(this, "Enter the school app URL (or turn off cloud push).", Text,
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                string url = _apiBaseUrl.Text.Trim();
                if (url.IndexOf('.') < 0)
                {
                    MessageBox.Show(this,
                        "School app URL looks incomplete.\nPaste the full URL, for example:\nhttps://your-app.vercel.app",
                        Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                if (string.IsNullOrWhiteSpace(_apiKey.Text))
                {
                    MessageBox.Show(this, "Enter the API key (or turn off cloud push).", Text,
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
            }

            Result.Ip = _ip.Text.Trim();
            Result.Port = (int)_port.Value;
            Result.MachineNumber = (int)_machine.Value;
            Result.Password = (int)_password.Value;
            Result.IntervalMinutes = (int)_interval.Value;
            Result.PullAll = _pullAll.Checked;
            Result.StartWithWindows = _startWithWindows.Checked;
            Result.ApiBaseUrl = _apiBaseUrl.Text.Trim().TrimEnd('/');
            Result.ApiKey = _apiKey.Text.Trim();
            Result.PushEnabled = _pushEnabled.Checked;
            Result.Configured = true;
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
