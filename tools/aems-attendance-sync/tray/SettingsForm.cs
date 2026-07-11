using System;
using System.Drawing;
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
        readonly Button _save = new Button();
        readonly Button _test = new Button();
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
            ClientSize = new Size(420, 320);
            Font = new Font("Segoe UI", 9F);

            int y = 16;
            AddLabel("Device IP", 16, y); _ip.SetBounds(160, y - 2, 230, 24); _ip.Text = cfg.Ip ?? ""; Controls.Add(_ip); y += 36;
            AddLabel("Port", 16, y); _port.SetBounds(160, y - 2, 100, 24); _port.Minimum = 1; _port.Maximum = 65535; _port.Value = Clamp(cfg.Port, 1, 65535); Controls.Add(_port); y += 36;
            AddLabel("Machine number", 16, y); _machine.SetBounds(160, y - 2, 100, 24); _machine.Minimum = 1; _machine.Maximum = 999; _machine.Value = Clamp(cfg.MachineNumber, 1, 999); Controls.Add(_machine); y += 36;
            AddLabel("Comm password", 16, y); _password.SetBounds(160, y - 2, 100, 24); _password.Minimum = 0; _password.Maximum = 999999; _password.Value = Clamp(cfg.Password, 0, 999999); Controls.Add(_password); y += 36;
            AddLabel("Pull every (minutes)", 16, y); _interval.SetBounds(160, y - 2, 100, 24); _interval.Minimum = 1; _interval.Maximum = 1440; _interval.Value = Clamp(cfg.IntervalMinutes <= 0 ? 5 : cfg.IntervalMinutes, 1, 1440); Controls.Add(_interval); y += 36;

            _pullAll.Text = "Download all logs each time (slower; default is new/unread only)";
            _pullAll.SetBounds(16, y, 380, 24);
            _pullAll.Checked = cfg.PullAll;
            Controls.Add(_pullAll);
            y += 32;

            _startWithWindows.Text = "Start automatically when Windows starts";
            _startWithWindows.SetBounds(16, y, 380, 24);
            _startWithWindows.Checked = cfg.StartWithWindows;
            Controls.Add(_startWithWindows);
            y += 36;

            _test.Text = "Test connection";
            _test.SetBounds(16, y, 120, 30);
            _test.Click += TestClick;
            Controls.Add(_test);

            _save.Text = "Save & Start";
            _save.SetBounds(270, y, 120, 30);
            _save.Click += SaveClick;
            Controls.Add(_save);
            y += 40;

            _status.SetBounds(16, y, 380, 40);
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

        void TestClick(object sender, EventArgs e)
        {
            _status.Text = "Connecting...";
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
                using (var client = new DeviceClient(settings))
                {
                    if (!client.Connect())
                    {
                        _status.ForeColor = Color.Firebrick;
                        _status.Text = "Failed: " + client.LastErrorText();
                        return;
                    }
                    client.Disconnect();
                }
                _status.ForeColor = Color.DarkGreen;
                _status.Text = "Connected OK. You can Save & Start.";
            }
            catch (Exception ex)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = ex.Message;
            }
        }

        void SaveClick(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_ip.Text))
            {
                MessageBox.Show(this, "Enter the device IP address.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            Result.Ip = _ip.Text.Trim();
            Result.Port = (int)_port.Value;
            Result.MachineNumber = (int)_machine.Value;
            Result.Password = (int)_password.Value;
            Result.IntervalMinutes = (int)_interval.Value;
            Result.PullAll = _pullAll.Checked;
            Result.StartWithWindows = _startWithWindows.Checked;
            Result.Configured = true;
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
