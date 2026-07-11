namespace AemsAttendanceSync
{
    public static class ErrorCodes
    {
        public static string Describe(int code)
        {
            switch (code)
            {
                case 0: return "SUCCESS";
                case 1: return "ERR_COMPORT_ERROR";
                case 2: return "ERR_WRITE_FAIL";
                case 3: return "ERR_READ_FAIL";
                case 4: return "ERR_INVALID_PARAM";
                case 5: return "ERR_NON_CARRYOUT";
                case 6: return "ERR_LOG_END";
                case 7: return "ERR_MEMORY";
                case 8: return "ERR_MULTIUSER";
                default: return "UNKNOWN_ERROR_" + code;
            }
        }
    }
}
