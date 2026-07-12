using System;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Threading;

namespace AemsAttendanceSync
{
    public static class MacResolver
    {
        public static string FindIpByMac(string targetMac, string currentIp)
        {
            if (string.IsNullOrWhiteSpace(targetMac)) return null;
            targetMac = targetMac.Replace("-", "").Replace(":", "").ToUpperInvariant();

            AppLog.Info("Scanning local ARP cache for MAC address: " + targetMac);
            string found = SearchArpCache(targetMac);
            if (found != null)
            {
                AppLog.Info("MAC address " + targetMac + " resolved to IP " + found + " via immediate ARP lookup.");
                return found;
            }

            // 2. Scan the /24 subnet based on the current/last IP
            if (!string.IsNullOrEmpty(currentIp))
            {
                int lastDot = currentIp.LastIndexOf('.');
                if (lastDot > 0)
                {
                    string baseIp = currentIp.Substring(0, lastDot + 1);
                    AppLog.Info("MAC not found in ARP cache. Executing background ping sweep on subnet: " + baseIp + "1-254");
                    ScanSubnet(baseIp);
                    
                    // 3. Check ARP again after sweep
                    AppLog.Info("Ping sweep complete. Re-checking ARP cache...");
                    found = SearchArpCache(targetMac);
                    if (found != null)
                    {
                        AppLog.Info("MAC address " + targetMac + " resolved to IP " + found + " after ping sweep.");
                        return found;
                    }
                }
            }
            AppLog.Info("Failed to resolve MAC address " + targetMac + " even after ping sweep.");
            return null;
        }

        static string SearchArpCache(string targetMac)
        {
            try
            {
                var psi = new ProcessStartInfo("arp", "-a")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using (var p = Process.Start(psi))
                {
                    string output = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();

                    foreach (string line in output.Split('\n'))
                    {
                        var parts = line.Split(new[] { ' ', '\t', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2)
                        {
                            string ip = parts[0];
                            string mac = parts[1].Replace("-", "").Replace(":", "").ToUpperInvariant();
                            if (mac == targetMac)
                                return ip;
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        static void ScanSubnet(string baseIp)
        {
            var countdown = new CountdownEvent(254);
            for (int i = 1; i <= 254; i++)
            {
                string ip = baseIp + i;
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    try
                    {
                        using (var p = new Ping())
                        {
                            // 500ms is plenty for local LAN ping
                            p.Send(ip, 500);
                        }
                    }
                    catch { }
                    finally
                    {
                        countdown.Signal();
                    }
                });
            }
            // Wait up to 3 seconds for all pings to complete
            countdown.Wait(3000);
        }
    }
}
