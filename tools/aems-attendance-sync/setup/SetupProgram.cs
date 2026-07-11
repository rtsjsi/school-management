using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace AemsAttendanceSync.Setup
{
    static class SetupProgram
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool uninstall = false;
            bool fromTemp = false;
            foreach (string a in args)
            {
                if (string.Equals(a, "/uninstall", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(a, "-uninstall", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(a, "/u", StringComparison.OrdinalIgnoreCase))
                    uninstall = true;
                if (string.Equals(a, "/fromtemp", StringComparison.OrdinalIgnoreCase))
                    fromTemp = true;
            }

            if (uninstall)
            {
                // Control Panel runs Setup from Program Files — that locks Setup.exe,
                // so re-launch a temp copy to delete the install folder cleanly.
                if (!fromTemp && Installer.IsRunningFromInstallDir())
                {
                    try
                    {
                        Installer.RelaunchUninstallFromTemp();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(ex.Message, Installer.AppName + " Setup",
                            MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                    return;
                }

                try
                {
                    Installer.Uninstall();
                    MessageBox.Show(Installer.AppName + " has been removed.", Installer.AppName + " Setup",
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show(ex.Message, Installer.AppName + " Setup",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return;
            }

            Application.Run(new SetupForm());
        }
    }
}
