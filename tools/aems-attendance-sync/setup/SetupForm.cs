using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace AemsAttendanceSync.Setup
{
    public sealed class SetupForm : Form
    {
        readonly CheckBox _desktop = new CheckBox();
        readonly CheckBox _startMenu = new CheckBox();
        readonly CheckBox _startup = new CheckBox();
        readonly CheckBox _launch = new CheckBox();
        readonly Button _install = new Button();
        readonly Button _uninstall = new Button();
        readonly Label _status = new Label();
        readonly Label _path = new Label();

        public SetupForm()
        {
            Text = Installer.AppName + " Setup";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(460, 280);
            Font = new Font("Segoe UI", 9F);

            var title = new Label();
            title.Text = "Install " + Installer.AppName;
            title.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            title.SetBounds(16, 16, 420, 24);
            Controls.Add(title);

            _path.Text = "Install to: " + Installer.InstallDir;
            _path.SetBounds(16, 48, 420, 40);
            Controls.Add(_path);

            _desktop.Text = "Create Desktop shortcut";
            _desktop.Checked = true;
            _desktop.SetBounds(16, 100, 300, 24);
            Controls.Add(_desktop);

            _startMenu.Text = "Create Start Menu shortcut";
            _startMenu.Checked = true;
            _startMenu.SetBounds(16, 128, 300, 24);
            Controls.Add(_startMenu);

            _startup.Text = "Start with Windows";
            _startup.Checked = true;
            _startup.SetBounds(16, 156, 300, 24);
            Controls.Add(_startup);

            _launch.Text = "Launch after install";
            _launch.Checked = true;
            _launch.SetBounds(16, 184, 300, 24);
            Controls.Add(_launch);

            _install.Text = "Install";
            _install.SetBounds(240, 220, 90, 32);
            _install.Click += InstallClick;
            Controls.Add(_install);

            _uninstall.Text = "Uninstall";
            _uninstall.SetBounds(340, 220, 90, 32);
            _uninstall.Click += UninstallClick;
            Controls.Add(_uninstall);

            _status.SetBounds(16, 220, 210, 40);
            _status.ForeColor = Color.DimGray;
            Controls.Add(_status);

            if (!Directory.Exists(Installer.PayloadDir))
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Missing 'app' folder next to this Setup.";
                _install.Enabled = false;
            }
        }

        void InstallClick(object sender, EventArgs e)
        {
            try
            {
                _status.ForeColor = Color.DimGray;
                _status.Text = "Installing...";
                Application.DoEvents();

                bool launchAfter = _launch.Checked;
                string title = Text;
                Installer.Install(new Installer.Options
                {
                    DesktopShortcut = _desktop.Checked,
                    StartMenuShortcut = _startMenu.Checked,
                    StartWithWindows = _startup.Checked
                });

                Hide();
                MessageBox.Show(
                    Installer.AppName + " was installed to:\n" + Installer.InstallDir +
                    (launchAfter
                        ? "\n\nClick OK to open the app."
                        : "\n\nOpen it from the Start Menu or Desktop shortcut."),
                    title, MessageBoxButtons.OK, MessageBoxIcon.Information);

                if (launchAfter)
                    Installer.LaunchInstalledApp();

                Close();
            }
            catch (Exception ex)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Install failed.";
                MessageBox.Show(this, ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        void UninstallClick(object sender, EventArgs e)
        {
            if (MessageBox.Show(this, "Remove " + Installer.AppName + " from this PC?", Text,
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            try
            {
                Installer.Uninstall();
                _status.ForeColor = Color.DarkGreen;
                _status.Text = "Uninstalled.";
                MessageBox.Show(this, Installer.AppName + " has been removed.", Text,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                _status.ForeColor = Color.Firebrick;
                _status.Text = "Uninstall failed.";
                MessageBox.Show(this, ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
