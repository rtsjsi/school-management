using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using sbxpc;

namespace AemsAttendanceSync
{
    public sealed class DeviceSettings
    {
        public int MachineNumber { get; set; }
        public string Ip { get; set; }
        public int Port { get; set; }
        public int Password { get; set; }

        public static DeviceSettings Defaults()
        {
            return new DeviceSettings
            {
                MachineNumber = 1,
                Ip = "192.168.1.224",
                Port = 5005,
                Password = 0
            };
        }
    }

    public sealed class GLogPosInfo
    {
        public int LogCount { get; set; }
        public int StartPos { get; set; }
        public int EndPos { get; set; }
        public int MaxCount { get; set; }
        public int MinPos { get; set; }
        public int MaxPos { get; set; }
    }

    public sealed class DeviceClient : IDisposable
    {
        private readonly DeviceSettings _settings;
        private bool _initialized;
        private bool _connected;
        private static bool _globalNativeReady;
        private static readonly object InitLock = new object();

        public DeviceClient(DeviceSettings settings)
        {
            if (settings == null) throw new ArgumentNullException("settings");
            if (string.IsNullOrWhiteSpace(settings.Ip))
                throw new ArgumentException("Device IP is required.", "settings");

            _settings = settings;
        }

        public int MachineNumber
        {
            get { return _settings.MachineNumber; }
        }

        public bool IsConnected
        {
            get { return _connected; }
        }

        /// <summary>
        /// Drop any orphaned native TCP session. ERR_NON_CARRYOUT (5) on Connect usually
        /// means the DLL still thinks a prior session is active.
        /// Must not throw — EnableDevice/Disconnect can AV if no session exists.
        /// </summary>
        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        public static void ResetNativeSession(int machineNumber)
        {
            try { SBXPCDLL.EnableDevice(machineNumber, 1); }
            catch (AccessViolationException) { }
            catch (SEHException) { }
            catch { }

            try { SBXPCDLL.Disconnect(machineNumber); }
            catch (AccessViolationException) { }
            catch (SEHException) { }
            catch { }

            try { Thread.Sleep(150); }
            catch { }
        }

        public void Initialize()
        {
            if (_initialized) return;
            lock (InitLock)
            {
                if (!_globalNativeReady)
                {
                    SBXPCDLL.DotNET();
                    SBXPCDLL._DisableTranseiveCallback();
                    _globalNativeReady = true;
                }
            }
            _initialized = true;
        }

        public bool Connect()
        {
            Initialize();

            if (_connected)
                return true;

            string ip = _settings.Ip.Trim();
            int machine = _settings.MachineNumber;

            // 1) Soft connect first — aggressive Disconnect beforehand can leave the SDK
            //    returning false with GetLastError SUCCESS(0) even when the device is fine.
            if (TryMarkConnected(SafeConnectTcpip(machine, ip, _settings.Port, _settings.Password), machine))
                return true;

            // 2) Reset + retry (covers stale ERR_NON_CARRYOUT sessions).
            for (int attempt = 1; attempt <= 2; attempt++)
            {
                ResetNativeSession(machine);
                Thread.Sleep(300 * attempt);

                if (TryMarkConnected(SafeConnectTcpip(machine, ip, _settings.Port, _settings.Password), machine))
                    return true;
            }

            _connected = false;
            AppLog.Error("ConnectTcpip failed for " + ip + ":" + _settings.Port + " — " + LastErrorText());
            return false;
        }

        /// <summary>
        /// Interpret ConnectTcpip result. SDK often returns false with SUCCESS(0) or
        /// ERR_NON_CARRYOUT(5) when a session is already usable — probe before failing.
        /// </summary>
        bool TryMarkConnected(bool connectReturnedTrue, int machineNumber)
        {
            if (connectReturnedTrue)
            {
                _connected = true;
                return true;
            }

            int err = ReadLastErrorCode();

            // 5 = ERR_NON_CARRYOUT — DLL already has an active session (common after a prior
            // sync that did not fully tear down). Treat as connected; do not require probe
            // because EnableDevice can also return NON_CARRYOUT on a live session.
            if (err == 5)
            {
                AppLog.Info("ConnectTcpip returned ERR_NON_CARRYOUT(5) — treating as already connected.");
                _connected = true;
                return true;
            }

            // 0 = SUCCESS leftover with false return — probe before trusting it.
            if (err == 0 && SoftProbeSession(machineNumber))
            {
                AppLog.Info(
                    "ConnectTcpip returned false (err=0) but session probe succeeded — treating as connected.");
                _connected = true;
                return true;
            }

            return false;
        }

        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        static bool SoftProbeSession(int machineNumber)
        {
            try
            {
                // EnableDevice only succeeds when a live session exists.
                if (!SBXPCDLL.EnableDevice(machineNumber, 0))
                    return false;
                SBXPCDLL.EnableDevice(machineNumber, 1);
                return true;
            }
            catch (AccessViolationException)
            {
                return false;
            }
            catch (SEHException)
            {
                return false;
            }
            catch
            {
                return false;
            }
        }

        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        int ReadLastErrorCode()
        {
            try
            {
                int code;
                if (SBXPCDLL.GetLastError(_settings.MachineNumber, out code))
                    return code;
            }
            catch { }
            return -1;
        }

        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        static bool SafeConnectTcpip(int machineNumber, string ip, int port, int password)
        {
            try
            {
                return SBXPCDLL.ConnectTcpip(machineNumber, ip, port, password);
            }
            catch (AccessViolationException ex)
            {
                AppLog.Crash("ConnectTcpip AccessViolation", ex);
                return false;
            }
            catch (SEHException ex)
            {
                AppLog.Error("ConnectTcpip SEHException", ex);
                return false;
            }
        }

        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        public void Disconnect()
        {
            if (!_connected) return;
            try
            {
                try { SBXPCDLL.EnableDevice(_settings.MachineNumber, 1); }
                catch { }
                SBXPCDLL.Disconnect(_settings.MachineNumber);
            }
            catch (AccessViolationException ex)
            {
                AppLog.Crash("Disconnect AccessViolation", ex);
            }
            catch (SEHException ex)
            {
                AppLog.Error("Disconnect SEHException", ex);
            }
            catch (Exception ex)
            {
                AppLog.Error("Disconnect failed", ex);
            }
            finally
            {
                _connected = false;
            }
        }

        [System.Runtime.ExceptionServices.HandleProcessCorruptedStateExceptions]
        [System.Security.SecurityCritical]
        public string LastErrorText()
        {
            try
            {
                int code;
                if (!SBXPCDLL.GetLastError(_settings.MachineNumber, out code))
                    return "Unable to read last error";
                if (code == 0)
                    return "ConnectTcpip returned false with SUCCESS(0) — SDK quirk; try Sync now if device is online";
                return ErrorCodes.Describe(code) + " (" + code + ")";
            }
            catch (AccessViolationException)
            {
                return "native crash reading error code";
            }
            catch
            {
                return "Unable to read last error";
            }
        }

        void Fail(string message)
        {
            AppLog.Error(message);
            throw new InvalidOperationException(message);
        }

        public GLogPosInfo GetGLogPosInfo()
        {
            EnsureConnected();

            string xml = null;
            SBXPCDLL.XML_AddString(ref xml, "REQUEST", "GetGLogPosInfo");
            SBXPCDLL.XML_AddString(ref xml, "MSGTYPE", "request");
            SBXPCDLL.XML_AddLong(ref xml, "MachineID", _settings.MachineNumber);

            if (!SBXPCDLL.GeneralOperationXML(_settings.MachineNumber, ref xml))
                Fail("GetGLogPosInfo failed: " + LastErrorText());

            return new GLogPosInfo
            {
                LogCount = SBXPCDLL.XML_ParseInt(ref xml, "LogCount"),
                StartPos = SBXPCDLL.XML_ParseInt(ref xml, "StartPos"),
                EndPos = SBXPCDLL.XML_ParseInt(ref xml, "EndPos"),
                MaxCount = SBXPCDLL.XML_ParseInt(ref xml, "MaxCount"),
                MinPos = SBXPCDLL.XML_ParseInt(ref xml, "MinPos"),
                MaxPos = SBXPCDLL.XML_ParseInt(ref xml, "MaxPos")
            };
        }

        /// <summary>
        /// Pulls attendance GLogs. Does not clear device logs.
        /// </summary>
        /// <param name="all">If true, ReadAllGLogData; otherwise unread-only via ReadGeneralLogData(readMark=1).</param>
        public List<PunchRecord> PullGLogs(bool all)
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                bool readOk = all
                    ? SBXPCDLL.ReadAllGLogData(_settings.MachineNumber)
                    : SBXPCDLL.ReadGeneralLogData(_settings.MachineNumber, 1);

                if (!readOk)
                    Fail(
                        (all ? "ReadAllGLogData" : "ReadGeneralLogData") + " failed: " + LastErrorText());

                return DrainGLogs(all);
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        /// <summary>
        /// Pulls GLogs in a device buffer position range (for preview before delete).
        /// </summary>
        public List<PunchRecord> PullGLogsByPos(int startPos, int endPos)
        {
            EnsureConnected();
            if (startPos < 0 || endPos < 0)
                throw new ArgumentException("Positions must be >= 0.");
            if (endPos < startPos)
                throw new ArgumentException("to-pos must be >= from-pos.");

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.ReadGLogWithPos(_settings.MachineNumber, startPos, endPos))
                    Fail("ReadGLogWithPos failed: " + LastErrorText());

                return DrainGLogs(false);
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        /// <summary>
        /// Deletes GLogs from the start of the buffer through EndPos (SDK DeleteGLogWithPos).
        /// This is the only selective delete the device supports — not by person or date.
        /// </summary>
        public void DeleteGLogsToPos(int endPos)
        {
            EnsureConnected();
            if (endPos < 0)
                throw new ArgumentException("endPos must be >= 0.", "endPos");

            string xml = null;
            SBXPCDLL.XML_AddString(ref xml, "REQUEST", "DeleteGLogWithPos");
            SBXPCDLL.XML_AddString(ref xml, "MSGTYPE", "request");
            SBXPCDLL.XML_AddLong(ref xml, "MachineID", _settings.MachineNumber);
            SBXPCDLL.XML_AddInt(ref xml, "EndPos", endPos);

            if (!SBXPCDLL.GeneralOperationXML(_settings.MachineNumber, ref xml))
                Fail("DeleteGLogWithPos failed: " + LastErrorText());
        }

        /// <summary>
        /// Clears all attendance GLogs on the device.
        /// </summary>
        public void EmptyAllGLogs()
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.EmptyGeneralLogData(_settings.MachineNumber))
                    Fail("EmptyGeneralLogData failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public GLogPosInfo GetSLogPosInfo()
        {
            EnsureConnected();

            string xml = null;
            SBXPCDLL.XML_AddString(ref xml, "REQUEST", "GetSLogPosInfo");
            SBXPCDLL.XML_AddString(ref xml, "MSGTYPE", "request");
            SBXPCDLL.XML_AddLong(ref xml, "MachineID", _settings.MachineNumber);

            if (!SBXPCDLL.GeneralOperationXML(_settings.MachineNumber, ref xml))
                Fail("GetSLogPosInfo failed: " + LastErrorText());

            return new GLogPosInfo
            {
                LogCount = SBXPCDLL.XML_ParseInt(ref xml, "LogCount"),
                StartPos = SBXPCDLL.XML_ParseInt(ref xml, "StartPos"),
                EndPos = SBXPCDLL.XML_ParseInt(ref xml, "EndPos"),
                MaxCount = SBXPCDLL.XML_ParseInt(ref xml, "MaxCount"),
                MinPos = SBXPCDLL.XML_ParseInt(ref xml, "MinPos"),
                MaxPos = SBXPCDLL.XML_ParseInt(ref xml, "MaxPos")
            };
        }

        /// <summary>
        /// Pulls Super Logs (admin audit). Does not clear device logs.
        /// </summary>
        public List<SLogRecord> PullSLogs(bool all)
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                bool readOk = all
                    ? SBXPCDLL.ReadAllSLogData(_settings.MachineNumber)
                    : SBXPCDLL.ReadSuperLogData(_settings.MachineNumber, 1);

                if (!readOk)
                    Fail(
                        (all ? "ReadAllSLogData" : "ReadSuperLogData") + " failed: " + LastErrorText());

                return DrainSLogs(all);
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public List<SLogRecord> PullSLogsByPos(int startPos, int endPos)
        {
            EnsureConnected();
            if (startPos < 0 || endPos < 0)
                throw new ArgumentException("Positions must be >= 0.");
            if (endPos < startPos)
                throw new ArgumentException("to-pos must be >= from-pos.");

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.ReadSLogWithPos(_settings.MachineNumber, startPos, endPos))
                    Fail("ReadSLogWithPos failed: " + LastErrorText());

                return DrainSLogs(false);
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        /// <summary>
        /// Deletes SLogs from the start of the buffer through EndPos (DeleteSLogWithPos).
        /// </summary>
        public void DeleteSLogsToPos(int endPos)
        {
            EnsureConnected();
            if (endPos < 0)
                throw new ArgumentException("endPos must be >= 0.", "endPos");

            string xml = null;
            SBXPCDLL.XML_AddString(ref xml, "REQUEST", "DeleteSLogWithPos");
            SBXPCDLL.XML_AddString(ref xml, "MSGTYPE", "request");
            SBXPCDLL.XML_AddLong(ref xml, "MachineID", _settings.MachineNumber);
            SBXPCDLL.XML_AddInt(ref xml, "EndPos", endPos);

            if (!SBXPCDLL.GeneralOperationXML(_settings.MachineNumber, ref xml))
                Fail("DeleteSLogWithPos failed: " + LastErrorText());
        }

        public void EmptyAllSLogs()
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.EmptySuperLogData(_settings.MachineNumber))
                    Fail("EmptySuperLogData failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        private List<PunchRecord> DrainGLogs(bool useGetAll)
        {
            var punches = new List<PunchRecord>();
            while (true)
            {
                int tmno, seno, smno, vmode, yr, mon, day, hr, min, sec;
                bool got = useGetAll
                    ? SBXPCDLL.GetAllGLogData(
                        _settings.MachineNumber,
                        out tmno, out seno, out smno, out vmode,
                        out yr, out mon, out day, out hr, out min, out sec)
                    : SBXPCDLL.GetGeneralLogData(
                        _settings.MachineNumber,
                        out tmno, out seno, out smno, out vmode,
                        out yr, out mon, out day, out hr, out min, out sec);

                if (!got) break;

                punches.Add(new PunchRecord
                {
                    EnrollNo = seno,
                    MachineNo = smno,
                    PunchedAt = SafeDateTime(yr, mon, day, hr, min, sec),
                    Direction = GLogDecoder.DecodeSimpleDirection(vmode),
                    VerifyMethod = GLogDecoder.DecodeVerifyMethod(vmode),
                    RawVerifyMode = vmode,
                    PhotoIndex = tmno
                });
            }
            return punches;
        }

        private List<SLogRecord> DrainSLogs(bool useGetAll)
        {
            var logs = new List<SLogRecord>();
            while (true)
            {
                int tmno, seno, smno, geno, gmno, mnpl, fpno, yr, mon, day, hr, min, sec;
                bool got = useGetAll
                    ? SBXPCDLL.GetAllSLogData(
                        _settings.MachineNumber,
                        out tmno, out seno, out smno, out geno, out gmno,
                        out mnpl, out fpno,
                        out yr, out mon, out day, out hr, out min, out sec)
                    : SBXPCDLL.GetSuperLogData(
                        _settings.MachineNumber,
                        out tmno, out seno, out smno, out geno, out gmno,
                        out mnpl, out fpno,
                        out yr, out mon, out day, out hr, out min, out sec);

                if (!got) break;

                logs.Add(new SLogRecord
                {
                    PhotoOrTMachine = tmno,
                    AdminEnrollNo = seno,
                    AdminMachineNo = smno,
                    TargetEnrollNo = geno,
                    TargetMachineNo = gmno,
                    ManipulationCode = mnpl,
                    Manipulation = SLogDecoder.DecodeManipulation(mnpl),
                    BackupNo = fpno,
                    FingerOrMedia = SLogDecoder.DecodeFingerOrMedia(fpno),
                    LoggedAt = SafeDateTime(yr, mon, day, hr, min, sec)
                });
            }
            return logs;
        }

        public List<UserIdRecord> ListUsers(bool includeNames)
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.ReadAllUserID(_settings.MachineNumber))
                    Fail("ReadAllUserID failed: " + LastErrorText());

                var users = new List<UserIdRecord>();
                var nameCache = new Dictionary<int, string>();

                while (true)
                {
                    int enrollNo, eMachineNo, backupNo, privilege, enable;
                    if (!SBXPCDLL.GetAllUserID(
                        _settings.MachineNumber,
                        out enrollNo, out eMachineNo, out backupNo, out privilege, out enable))
                        break;

                    var rec = new UserIdRecord
                    {
                        EnrollNo = enrollNo,
                        EMachineNo = eMachineNo,
                        BackupNo = backupNo,
                        BackupLabel = BackupDecoder.Label(backupNo),
                        Privilege = privilege,
                        EnableRaw = enable,
                        Enabled = (enable % 256) != 0,
                        Duress = enable / 256
                    };

                    if (includeNames)
                    {
                        string name;
                        if (!nameCache.TryGetValue(enrollNo, out name))
                        {
                            name = "";
                            try
                            {
                                string fetched;
                                if (SBXPCDLL.GetUserName1(_settings.MachineNumber, enrollNo, out fetched)
                                    && fetched != null)
                                    name = fetched.Trim();
                            }
                            catch { }
                            nameCache[enrollNo] = name;
                        }
                        rec.Name = name;
                    }

                    users.Add(rec);
                }

                return users;
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public string GetUserName(int enrollNo)
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                string name;
                if (!SBXPCDLL.GetUserName1(_settings.MachineNumber, enrollNo, out name))
                    Fail("GetUserName1 failed: " + LastErrorText());
                return name ?? "";
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public void SetUserName(int enrollNo, string name)
        {
            EnsureConnected();
            if (name == null) name = "";

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.SetUserName1(_settings.MachineNumber, enrollNo, name))
                    Fail("SetUserName1 failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public EnrollTemplate GetEnrollData(int enrollNo, int backupNo)
        {
            EnsureConnected();
            backupNo = BackupDecoder.NormalizeBackup(backupNo);

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            var templateInts = new int[BackupDecoder.MaxTemplateIntCount];
            GCHandle gh = GCHandle.Alloc(templateInts, GCHandleType.Pinned);
            try
            {
                IntPtr addr = gh.AddrOfPinnedObject();
                int privilege;
                int passwordOrCard;
                if (!SBXPCDLL.GetEnrollData1(
                    _settings.MachineNumber, enrollNo, backupNo,
                    out privilege, addr, out passwordOrCard))
                    Fail("GetEnrollData1 failed: " + LastErrorText());

                return new EnrollTemplate
                {
                    EnrollNo = enrollNo,
                    BackupNo = backupNo,
                    BackupLabel = BackupDecoder.Label(backupNo),
                    Privilege = privilege,
                    PasswordOrCard = passwordOrCard,
                    TemplateInts = templateInts
                };
            }
            finally
            {
                gh.Free();
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public void SetEnrollData(int enrollNo, int backupNo, int privilege, int[] templateInts, int passwordOrCard)
        {
            EnsureConnected();
            backupNo = BackupDecoder.NormalizeBackup(backupNo);
            if (templateInts == null)
                templateInts = new int[BackupDecoder.MaxTemplateIntCount];

            var buffer = new int[BackupDecoder.MaxTemplateIntCount];
            int copy = Math.Min(templateInts.Length, buffer.Length);
            Array.Copy(templateInts, buffer, copy);

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            GCHandle gh = GCHandle.Alloc(buffer, GCHandleType.Pinned);
            try
            {
                IntPtr addr = gh.AddrOfPinnedObject();
                if (!SBXPCDLL.SetEnrollData1(
                    _settings.MachineNumber, enrollNo, backupNo, privilege, addr, passwordOrCard))
                    Fail("SetEnrollData1 failed: " + LastErrorText());
            }
            finally
            {
                gh.Free();
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public void DeleteEnrollData(int enrollNo, int eMachineNo, int backupNo)
        {
            EnsureConnected();
            backupNo = BackupDecoder.NormalizeBackup(backupNo);

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.DeleteEnrollData(
                    _settings.MachineNumber, enrollNo, eMachineNo, backupNo))
                    Fail("DeleteEnrollData failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public void EnableUser(int enrollNo, int eMachineNo, int backupNo, bool enabled)
        {
            EnsureConnected();
            backupNo = BackupDecoder.NormalizeBackup(backupNo);

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.EnableUser(
                    _settings.MachineNumber, enrollNo, eMachineNo, backupNo, enabled ? (byte)1 : (byte)0))
                    Fail("EnableUser failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        public void EmptyAllEnrollData()
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                if (!SBXPCDLL.EmptyEnrollData(_settings.MachineNumber))
                    Fail("EmptyEnrollData failed: " + LastErrorText());
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }

        private void EnsureConnected()
        {
            if (!_connected)
                Fail("Not connected. Call Connect() first.");
        }

        private static DateTime SafeDateTime(int yr, int mon, int day, int hr, int min, int sec)
        {
            try
            {
                return new DateTime(yr, mon, day, hr, min, sec);
            }
            catch (ArgumentOutOfRangeException)
            {
                return DateTime.MinValue;
            }
        }

        public void Dispose()
        {
            Disconnect();
        }

        /// <summary>
        /// Fetch enrolled user photo (compressed JPEG, typically 8 KB). Returns null if none / unsupported.
        /// </summary>
        public byte[] TryGetUserPhoto(int enrollNo)
        {
            EnsureConnected();

            bool enabledOff = SBXPCDLL.EnableDevice(_settings.MachineNumber, 0);
            if (!enabledOff)
                Fail("EnableDevice(0) failed: " + LastErrorText());

            try
            {
                string xml = "";
                if (!SBXPCDLL.XML_AddString(ref xml, "REQUEST", "GetUserPhotoData"))
                    return null;
                if (!SBXPCDLL.XML_AddString(ref xml, "MSGTYPE", "request"))
                    return null;
                if (!SBXPCDLL.XML_AddInt(ref xml, "MachineID", _settings.MachineNumber))
                    return null;
                if (!SBXPCDLL.XML_AddString(ref xml, "UserID", enrollNo.ToString()))
                    return null;

                if (!SBXPCDLL.GeneralOperationXML(_settings.MachineNumber, ref xml))
                {
                    AppLog.Error("GetUserPhotoData failed for enroll " + enrollNo + ": " + LastErrorText());
                    return null;
                }

                const int photoSize = 8192;
                var photoData = new byte[photoSize];
                GCHandle gh = GCHandle.Alloc(photoData, GCHandleType.Pinned);
                try
                {
                    IntPtr addr = gh.AddrOfPinnedObject();
                    if (!SBXPCDLL.XML_ParseBinaryLong(ref xml, "PhotoData", addr, photoSize))
                        return null;
                }
                finally
                {
                    gh.Free();
                }

                // Empty / all-zero payload means no real photo.
                bool any = false;
                for (int i = 0; i < photoData.Length; i++)
                {
                    if (photoData[i] != 0) { any = true; break; }
                }
                return any ? photoData : null;
            }
            finally
            {
                SBXPCDLL.EnableDevice(_settings.MachineNumber, 1);
            }
        }
    }
}
