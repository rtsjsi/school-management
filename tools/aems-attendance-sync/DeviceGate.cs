using System;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using System.Security;
using System.Threading;

namespace AemsAttendanceSync
{
    /// <summary>
    /// Serializes all SBXPC device calls — the native DLL is not thread-safe.
    /// Also traps AccessViolation from SBPCCOMM so the tray app can survive bad connects.
    /// </summary>
    public static class DeviceGate
    {
        static readonly object Gate = new object();

        public static void Run(Action action)
        {
            if (action == null) throw new ArgumentNullException("action");
            lock (Gate) InvokeNative(action);
        }

        public static T Run<T>(Func<T> action)
        {
            if (action == null) throw new ArgumentNullException("action");
            lock (Gate) return InvokeNative(action);
        }

        public static bool TryRun(Action action, int waitMs, out string busyMessage)
        {
            busyMessage = null;
            if (action == null) throw new ArgumentNullException("action");
            if (!Monitor.TryEnter(Gate, waitMs))
            {
                busyMessage = "Device is busy (sync in progress). Try again in a moment.";
                return false;
            }
            try
            {
                InvokeNative(action);
                return true;
            }
            catch (InvalidOperationException ex)
            {
                busyMessage = ex.Message;
                return false;
            }
            finally
            {
                Monitor.Exit(Gate);
            }
        }

        [HandleProcessCorruptedStateExceptions]
        [SecurityCritical]
        static void InvokeNative(Action action)
        {
            try
            {
                action();
            }
            catch (AccessViolationException ex)
            {
                AppLog.Crash("Native AccessViolation in device call", ex);
                throw new InvalidOperationException(
                    "Biometric device communication crashed (native). Close other device tools and try again.",
                    ex);
            }
            catch (SEHException ex)
            {
                AppLog.Error("Native SEHException in device call", ex);
                throw new InvalidOperationException(
                    "Biometric device communication failed (native). Try again in a moment.",
                    ex);
            }
        }

        [HandleProcessCorruptedStateExceptions]
        [SecurityCritical]
        static T InvokeNative<T>(Func<T> action)
        {
            try
            {
                return action();
            }
            catch (AccessViolationException ex)
            {
                AppLog.Crash("Native AccessViolation in device call", ex);
                throw new InvalidOperationException(
                    "Biometric device communication crashed (native). Close other device tools and try again.",
                    ex);
            }
            catch (SEHException ex)
            {
                AppLog.Error("Native SEHException in device call", ex);
                throw new InvalidOperationException(
                    "Biometric device communication failed (native). Try again in a moment.",
                    ex);
            }
        }
    }
}
