namespace AemsAttendanceSync
{
    /// <summary>
    /// Decodes Super Log (SLog) manipulation and backup/finger fields
    /// (same mapping as the vendor sample SLogInfo).
    /// </summary>
    public static class SLogDecoder
    {
        public static string DecodeManipulation(int mnpl)
        {
            switch (mnpl)
            {
                case 1:
                case 2:
                case 3:
                    return "Enroll User";
                case 4:
                    return "Enroll Manager";
                case 5:
                    return "Delete Fp Data";
                case 6:
                    return "Delete Password";
                case 7:
                    return "Delete Card Data";
                case 8:
                    return "Delete All LogData";
                case 9:
                    return "Modify System Info";
                case 10:
                    return "Modify System Time";
                case 11:
                    return "Modify Log Setting";
                case 12:
                    return "Modify Comm Setting";
                case 13:
                    return "Modify Timezone Setting";
                case 14:
                    return "Delete Face";
                default:
                    return "Unknown";
            }
        }

        public static string DecodeFingerOrMedia(int fpno)
        {
            if (fpno < 10) return "Finger" + fpno;
            if (fpno == 10) return "Password";
            if (fpno == 14) return "Face";
            return "Card";
        }
    }
}
