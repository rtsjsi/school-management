using System;

namespace AemsAttendanceSync
{
    public sealed class PunchRecord
    {
        public int EnrollNo { get; set; }
        public int MachineNo { get; set; }
        public DateTime PunchedAt { get; set; }
        public string Direction { get; set; }
        public string VerifyMethod { get; set; }
        public int RawVerifyMode { get; set; }
        public int PhotoIndex { get; set; }

        public string PunchedAtText
        {
            get { return PunchedAt.ToString("yyyy-MM-dd HH:mm:ss"); }
        }
    }
}
