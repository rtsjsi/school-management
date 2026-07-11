namespace AemsAttendanceSync
{
    /// <summary>
    /// Decodes packed dwVerifyMode from SBXPC GLog records
    /// (same bit layout as the vendor sample GLogInfo.verify_mode).
    /// </summary>
    public static class GLogDecoder
    {
        public static string DecodeDirection(int vmode)
        {
            switch ((vmode >> 8) & 0xFF)
            {
                case 0: return "DutyOn";
                case 1: return "DutyOff";
                case 2: return "OverOn";
                case 3: return "OverOff";
                case 4: return "GoIn";
                case 5: return "GoOut";
                default: return "Unknown";
            }
        }

        public static string DecodeVerifyMethod(int vmode)
        {
            int vm = vmode & 0xFF;
            switch (vm)
            {
                case 1:
                case 51:
                case 101:
                case 151:
                    return "Fingerprint";
                case 2:
                case 52:
                case 102:
                case 152:
                    return "Password";
                case 3:
                case 53:
                case 103:
                case 153:
                    return "Card";
                case 4: return "FP+Card";
                case 5: return "FP+Pwd";
                case 6: return "Card+Pwd";
                case 7: return "FP+Card+Pwd";
                case 10: return "HandLock";
                case 11: return "ProgLock";
                case 12: return "ProgOpen";
                case 13: return "ProgClose";
                case 14: return "AutoRecover";
                case 20: return "LockOver";
                case 21: return "IllegalOpen";
                case 22: return "DuressAlarm";
                case 23: return "TamperDetect";
                case 30: return "Face";
                case 31: return "Face+Card";
                case 32: return "Face+Pwd";
                case 33: return "Face+Card+Pwd";
                case 34: return "Face+FP";
                default: return "Unknown(" + vm + ")";
            }
        }

        /// <summary>
        /// Maps attendance status / legacy IN-OUT verify codes to a simple IN/OUT/OT/Unknown.
        /// Legacy codes 51–53 / 101–103 / 151–153 encode direction in the low byte and take priority.
        /// </summary>
        public static string DecodeSimpleDirection(int vmode)
        {
            int vm = vmode & 0xFF;
            if (vm >= 51 && vm <= 53) return "IN";
            if (vm >= 101 && vm <= 103) return "OUT";
            if (vm >= 151 && vm <= 153) return "OT";

            int status = (vmode >> 8) & 0xFF;
            switch (status)
            {
                case 0:
                case 2:
                case 4:
                    return "IN";
                case 1:
                case 3:
                case 5:
                    return "OUT";
                default:
                    return "Unknown";
            }
        }
    }
}
