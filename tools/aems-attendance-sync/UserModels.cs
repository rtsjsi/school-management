using System;

namespace AemsAttendanceSync
{
    public sealed class UserIdRecord
    {
        public int EnrollNo { get; set; }
        public int EMachineNo { get; set; }
        public int BackupNo { get; set; }
        public string BackupLabel { get; set; }
        public int Privilege { get; set; }
        public int EnableRaw { get; set; }
        public bool Enabled { get; set; }
        public int Duress { get; set; }
        public string Name { get; set; }
    }

    public sealed class EnrollTemplate
    {
        public int EnrollNo { get; set; }
        public int BackupNo { get; set; }
        public string BackupLabel { get; set; }
        public int Privilege { get; set; }
        public int PasswordOrCard { get; set; }
        public int[] TemplateInts { get; set; }
    }

    public static class BackupDecoder
    {
        /// <summary>
        /// Maps UI-style backup 10 (password) to device backup 15, matching the vendor sample.
        /// </summary>
        public static int NormalizeBackup(int backup)
        {
            return backup == 10 ? 15 : backup;
        }

        public static string Label(int backup)
        {
            int b = NormalizeBackup(backup);
            if (b >= 0 && b <= 9) return "Finger" + b;
            switch (b)
            {
                case 11: return "Card";
                case 14: return "UserTimezone";
                case 15: return "Password";
                case 16: return "Department";
                case 17: return "Face";
                default: return "Backup" + b;
            }
        }

        public static bool IsTemplateBackup(int backup)
        {
            int b = NormalizeBackup(backup);
            return (b >= 0 && b <= 9) || b == 17;
        }

        /// <summary>
        /// Vendor sample skips FingerNumber &gt;= 50 — those are not real enroll slots
        /// and DeleteEnrollData returns ERR_INVALID_PARAM for them.
        /// </summary>
        public static bool IsDeletableBackup(int backup)
        {
            int b = NormalizeBackup(backup);
            if (b >= 50) return false;
            return true;
        }

        // FP template ints: (1404+12)/4 ; Face: 27668/4
        public const int FpIntCount = (1404 + 12) / 4;
        public const int FaceIntCount = 27668 / 4;
        public const int MaxTemplateIntCount = FaceIntCount;
    }
}
