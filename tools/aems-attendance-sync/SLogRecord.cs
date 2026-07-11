using System;

namespace AemsAttendanceSync
{
    public sealed class SLogRecord
    {
        public int AdminEnrollNo { get; set; }
        public int AdminMachineNo { get; set; }
        public int TargetEnrollNo { get; set; }
        public int TargetMachineNo { get; set; }
        public int ManipulationCode { get; set; }
        public string Manipulation { get; set; }
        public int BackupNo { get; set; }
        public string FingerOrMedia { get; set; }
        public DateTime LoggedAt { get; set; }
        public int PhotoOrTMachine { get; set; }

        public string LoggedAtText
        {
            get { return LoggedAt.ToString("yyyy-MM-dd HH:mm:ss"); }
        }
    }
}
