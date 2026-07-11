using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace AemsAttendanceSync
{
    /// <summary>
    /// Device user inventory (list, filter, rename, export, photo preview).
    /// Keeps one TCP session open while the window is open — reconnecting for each
    /// photo causes ERR_NON_CARRYOUT (5) on this device/SDK.
    /// </summary>
    public sealed class UsersForm : Form
    {
        /// <summary>True while Users window holds an open device session (blocks tray sync).</summary>
        public static bool DeviceSessionOpen { get; private set; }

        /// <summary>Device name field limit from vendor SDK sample (txtName.MaxLength).</summary>
        const int MaxUserNameLength = 24;

        readonly AppConfig _config;
        readonly DataGridView _grid = new DataGridView();
        readonly Button _refresh = new Button();
        readonly Button _editName = new Button();
        readonly Button _exportTemplate = new Button();
        readonly Button _exportCsv = new Button();
        readonly Label _status = new Label();
        readonly TextBox _filter = new TextBox();
        readonly PictureBox _photo = new PictureBox();
        readonly Label _photoTitle = new Label();
        readonly Label _photoHint = new Label();
        readonly BindingList<UserIdRecord> _view = new BindingList<UserIdRecord>();
        readonly Dictionary<int, Image> _photoCache = new Dictionary<int, Image>();
        readonly HashSet<int> _photoMissing = new HashSet<int>();
        List<UserIdRecord> _rows = new List<UserIdRecord>();
        DeviceClient _session;
        int _loadGeneration;
        int _photoRequestId;
        int _selectedEnroll = -1;
        bool _busy;

        public UsersForm(AppConfig config)
        {
            _config = config;
            Text = "AEMS Attendance Sync — Users";
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(980, 580);
            MinimumSize = new Size(800, 440);
            Font = new Font("Segoe UI", 9F);

            var top = new Panel();
            top.Dock = DockStyle.Top;
            top.Height = 48;
            top.Padding = new Padding(8);

            var lblFilter = new Label();
            lblFilter.Text = "Filter:";
            lblFilter.AutoSize = true;
            lblFilter.Location = new Point(10, 14);
            top.Controls.Add(lblFilter);

            _filter.SetBounds(55, 10, 220, 24);
            _filter.TextChanged += (s, e) => BindGrid();
            top.Controls.Add(_filter);

            _refresh.Text = "Refresh";
            _refresh.SetBounds(290, 8, 95, 28);
            _refresh.Click += RefreshClick;
            top.Controls.Add(_refresh);

            _editName.Text = "Edit name...";
            _editName.SetBounds(395, 8, 110, 28);
            _editName.Click += EditNameClick;
            top.Controls.Add(_editName);

            var hint = new Label();
            hint.Text = "Select a row to preview photo, or Edit name... to update it on the device.";
            hint.ForeColor = Color.DimGray;
            hint.SetBounds(520, 14, 430, 20);
            hint.Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top;
            top.Controls.Add(hint);
            Controls.Add(top);

            var bottom = new Panel();
            bottom.Dock = DockStyle.Bottom;
            bottom.Height = 52;
            bottom.Padding = new Padding(8);

            _exportTemplate.Text = "Export template…";
            _exportTemplate.SetBounds(10, 10, 130, 28);
            _exportTemplate.Click += ExportTemplateClick;
            bottom.Controls.Add(_exportTemplate);

            _exportCsv.Text = "Export CSV…";
            _exportCsv.SetBounds(146, 10, 120, 28);
            _exportCsv.Click += ExportCsvClick;
            bottom.Controls.Add(_exportCsv);

            _status.SetBounds(280, 14, 660, 24);
            _status.Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Top;
            _status.ForeColor = Color.DimGray;
            bottom.Controls.Add(_status);
            Controls.Add(bottom);

            var side = new Panel();
            side.Dock = DockStyle.Right;
            side.Width = 200;
            side.Padding = new Padding(12);
            side.BackColor = Color.FromArgb(245, 248, 252);

            _photoTitle.Text = "User photo";
            _photoTitle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            _photoTitle.SetBounds(12, 12, 176, 20);
            side.Controls.Add(_photoTitle);

            _photo.SetBounds(12, 40, 176, 176);
            _photo.BorderStyle = BorderStyle.FixedSingle;
            _photo.SizeMode = PictureBoxSizeMode.Zoom;
            _photo.BackColor = Color.White;
            side.Controls.Add(_photo);

            _photoHint.Text = "Select a user row";
            _photoHint.ForeColor = Color.DimGray;
            _photoHint.SetBounds(12, 226, 176, 60);
            side.Controls.Add(_photoHint);
            Controls.Add(side);

            _grid.Dock = DockStyle.Fill;
            _grid.ReadOnly = true;
            _grid.AllowUserToAddRows = false;
            _grid.AllowUserToDeleteRows = false;
            _grid.AllowUserToResizeRows = false;
            _grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            _grid.MultiSelect = false;
            _grid.AutoGenerateColumns = false;
            _grid.RowHeadersVisible = false;
            _grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            _grid.DataSource = _view;
            _grid.SelectionChanged += SelectionChanged;
            _grid.CellDoubleClick += (s, e) =>
            {
                if (e.RowIndex >= 0) EditNameClick(s, e);
            };
            AddColumns();
            Controls.Add(_grid);
            _grid.BringToFront();

            FormClosed += (s, e) =>
            {
                ClearPhotoCache();
                string busy;
                if (!DeviceGate.TryRun(CloseSessionLocked, 10000, out busy))
                {
                    // Gate busy — still drop the native session so the next open can connect.
                    try
                    {
                        DeviceClient.ResetNativeSession(_config.ToDeviceSettings().MachineNumber);
                    }
                    catch { }
                    DeviceSessionOpen = false;
                    _session = null;
                }
            };
            Shown += (s, e) => RefreshClick(s, e);
        }

        void CloseSessionLocked()
        {
            if (_session != null)
            {
                try { _session.Disconnect(); } catch { }
                try { _session.Dispose(); } catch { }
                _session = null;
            }
            else
            {
                // Previous Users window may have left a native session without this instance
                // holding the client — clear it or the next Connect returns ERR_NON_CARRYOUT.
                try
                {
                    DeviceClient.ResetNativeSession(_config.ToDeviceSettings().MachineNumber);
                }
                catch { }
            }
            DeviceSessionOpen = false;
        }

        DeviceClient EnsureSessionLocked(DeviceSettings settings)
        {
            if (_session != null && _session.IsConnected)
                return _session;

            CloseSessionLocked();
            var client = new DeviceClient(settings);
            if (!client.Connect())
            {
                AppLog.Error("User management connect failed — " + client.LastErrorText());
                string msg = client.NotReachableMessage();
                try { client.Dispose(); } catch { }
                throw new InvalidOperationException(msg);
            }
            _session = client;
            DeviceSessionOpen = true;
            return _session;
        }

        void AddColumns()
        {
            _grid.Columns.Add(Col("EnrollNo", "Enroll", 70));
            _grid.Columns.Add(Col("EMachineNo", "Machine", 70));
            _grid.Columns.Add(Col("BackupNo", "Backup #", 70));
            _grid.Columns.Add(Col("BackupLabel", "Type", 100));
            _grid.Columns.Add(Col("Privilege", "Priv", 50));
            _grid.Columns.Add(Col("Enabled", "Enabled", 70));
            _grid.Columns.Add(Col("Duress", "Duress", 60));
            _grid.Columns.Add(Col("Name", "Name", 160));
        }

        static DataGridViewTextBoxColumn Col(string prop, string header, int fillWeight)
        {
            var c = new DataGridViewTextBoxColumn();
            c.DataPropertyName = prop;
            c.HeaderText = header;
            c.Name = prop;
            c.FillWeight = fillWeight;
            return c;
        }

        UserIdRecord SelectedRow()
        {
            if (_grid.CurrentRow == null || _grid.CurrentRow.Index < 0) return null;
            return _grid.CurrentRow.DataBoundItem as UserIdRecord;
        }

        void SetBusy(bool busy, string message)
        {
            _busy = busy;
            UseWaitCursor = busy;
            _refresh.Enabled = !busy;
            _editName.Enabled = !busy;
            _exportTemplate.Enabled = !busy;
            _exportCsv.Enabled = !busy;
            _filter.Enabled = !busy;
            _status.Text = message ?? "";
        }

        void EditNameClick(object sender, EventArgs e)
        {
            if (_busy) return;
            if (!_config.Configured)
            {
                MessageBox.Show(this, "Configure device connection in Settings first.", Text,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            var row = SelectedRow();
            if (row == null)
            {
                MessageBox.Show(this, "Select a user row first.", Text,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string newName;
            if (!PromptUserName(row.EnrollNo, row.Name ?? "", out newName))
                return;

            if (string.Equals((row.Name ?? "").Trim(), newName, StringComparison.Ordinal))
            {
                _status.ForeColor = Color.DimGray;
                _status.Text = "Name unchanged.";
                return;
            }

            int enrollNo = row.EnrollNo;
            var settings = _config.ToDeviceSettings();
            SetBusy(true, "Updating name on device for enroll #" + enrollNo + "…");

            ThreadPool.QueueUserWorkItem(_ =>
            {
                string error = null;
                try
                {
                    string busy;
                    if (!DeviceGate.TryRun(() =>
                    {
                        EnsureSessionLocked(settings).SetUserName(enrollNo, newName);
                    }, 15000, out busy))
                    {
                        error = busy;
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }

                if (IsDisposed) return;
                BeginInvoke(new Action(() =>
                {
                    if (IsDisposed) return;
                    if (error != null)
                    {
                        _status.ForeColor = Color.Firebrick;
                        SetBusy(false, error);
                        MessageBox.Show(this, error, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }

                    ApplyNameLocally(enrollNo, newName);
                    BindGrid();
                    ReselectEnroll(enrollNo);
                    _status.ForeColor = Color.DarkGreen;
                    SetBusy(false, "Updated name for enroll #" + enrollNo + " on device.");
                }));
            });
        }

        bool PromptUserName(int enrollNo, string currentName, out string newName)
        {
            newName = currentName ?? "";
            using (var dlg = new Form())
            {
                dlg.Text = "Edit name — enroll #" + enrollNo;
                dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
                dlg.StartPosition = FormStartPosition.CenterParent;
                dlg.MinimizeBox = false;
                dlg.MaximizeBox = false;
                dlg.ShowInTaskbar = false;
                dlg.ClientSize = new Size(360, 130);
                dlg.Font = Font;

                var lbl = new Label();
                lbl.Text = "Name on biometric device (max " + MaxUserNameLength + " characters):";
                lbl.SetBounds(12, 12, 336, 20);
                dlg.Controls.Add(lbl);

                var box = new TextBox();
                box.SetBounds(12, 36, 336, 24);
                box.MaxLength = MaxUserNameLength;
                box.Text = currentName ?? "";
                box.SelectAll();
                dlg.Controls.Add(box);

                var ok = new Button();
                ok.Text = "Save to device";
                ok.DialogResult = DialogResult.OK;
                ok.SetBounds(168, 80, 110, 28);
                dlg.Controls.Add(ok);

                var cancel = new Button();
                cancel.Text = "Cancel";
                cancel.DialogResult = DialogResult.Cancel;
                cancel.SetBounds(284, 80, 64, 28);
                dlg.Controls.Add(cancel);

                dlg.AcceptButton = ok;
                dlg.CancelButton = cancel;

                if (dlg.ShowDialog(this) != DialogResult.OK)
                    return false;

                newName = (box.Text ?? "").Trim();
                if (newName.Length > MaxUserNameLength)
                    newName = newName.Substring(0, MaxUserNameLength);
                return true;
            }
        }

        void ApplyNameLocally(int enrollNo, string name)
        {
            foreach (var r in _rows)
            {
                if (r.EnrollNo == enrollNo)
                    r.Name = name;
            }
            if (_selectedEnroll == enrollNo)
                _photoTitle.Text = string.IsNullOrEmpty(name) ? ("Enroll " + enrollNo) : name;
        }

        void ReselectEnroll(int enrollNo)
        {
            for (int i = 0; i < _grid.Rows.Count; i++)
            {
                var item = _grid.Rows[i].DataBoundItem as UserIdRecord;
                if (item != null && item.EnrollNo == enrollNo)
                {
                    _grid.ClearSelection();
                    _grid.Rows[i].Selected = true;
                    _grid.CurrentCell = _grid.Rows[i].Cells[0];
                    break;
                }
            }
        }

        void ClearPhotoCache()
        {
            foreach (var img in _photoCache.Values)
            {
                try { if (img != null) img.Dispose(); } catch { }
            }
            _photoCache.Clear();
            _photoMissing.Clear();
            ClearPhotoUi("Select a user row");
        }

        void ClearPhotoUi(string hint)
        {
            Image old = _photo.Image;
            _photo.Image = null;
            if (old != null && !_photoCache.ContainsValue(old))
            {
                try { old.Dispose(); } catch { }
            }
            _photoHint.Text = hint ?? "";
            _photoTitle.Text = "User photo";
        }

        void ShowCachedPhoto(int enrollNo, string name)
        {
            Image img;
            if (_photoCache.TryGetValue(enrollNo, out img) && img != null)
            {
                _photo.Image = img;
                _photoTitle.Text = string.IsNullOrEmpty(name) ? ("Enroll " + enrollNo) : name;
                _photoHint.Text = "Enroll #" + enrollNo;
                return;
            }
            ClearPhotoUi(_photoMissing.Contains(enrollNo)
                ? "No photo on device for enroll #" + enrollNo
                : "Loading photo…");
            _photoTitle.Text = string.IsNullOrEmpty(name) ? ("Enroll " + enrollNo) : name;
        }

        void SelectionChanged(object sender, EventArgs e)
        {
            var row = SelectedRow();
            if (row == null)
            {
                _selectedEnroll = -1;
                ClearPhotoUi("Select a user row");
                return;
            }

            if (row.EnrollNo == _selectedEnroll && _photo.Image != null)
                return;

            _selectedEnroll = row.EnrollNo;
            ShowCachedPhoto(row.EnrollNo, row.Name);

            if (_photoCache.ContainsKey(row.EnrollNo) || _photoMissing.Contains(row.EnrollNo))
                return;

            LoadPhotoAsync(row.EnrollNo, row.Name);
        }

        void LoadPhotoAsync(int enrollNo, string name)
        {
            if (!_config.Configured) return;
            int req = Interlocked.Increment(ref _photoRequestId);
            _photoHint.Text = "Loading photo…";

            var settings = _config.ToDeviceSettings();
            ThreadPool.QueueUserWorkItem(_ =>
            {
                byte[] bytes = null;
                string error = null;
                try
                {
                    string busy;
                    if (!DeviceGate.TryRun(() =>
                    {
                        bytes = EnsureSessionLocked(settings).TryGetUserPhoto(enrollNo);
                    }, 15000, out busy))
                    {
                        error = busy;
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }

                Image image = null;
                if (bytes != null)
                {
                    try { image = ImageFromJpegBytes(bytes); }
                    catch { image = null; }
                }

                if (IsDisposed) { if (image != null) image.Dispose(); return; }
                BeginInvoke(new Action(() =>
                {
                    if (IsDisposed || req != _photoRequestId) { if (image != null) image.Dispose(); return; }

                    if (error != null)
                    {
                        if (_selectedEnroll == enrollNo)
                            ClearPhotoUi("Photo unavailable: " + error);
                        return;
                    }

                    if (image == null)
                    {
                        _photoMissing.Add(enrollNo);
                        if (_selectedEnroll == enrollNo)
                            ClearPhotoUi("No photo on device for enroll #" + enrollNo);
                        return;
                    }

                    Image previous;
                    if (_photoCache.TryGetValue(enrollNo, out previous) && previous != null)
                    {
                        try { previous.Dispose(); } catch { }
                    }
                    _photoCache[enrollNo] = image;
                    _photoMissing.Remove(enrollNo);

                    if (_selectedEnroll == enrollNo)
                        ShowCachedPhoto(enrollNo, name);
                }));
            });
        }

        static Image ImageFromJpegBytes(byte[] bytes)
        {
            using (var ms = new MemoryStream(bytes))
            using (var temp = Image.FromStream(ms))
            {
                // Clone so the stream can be disposed.
                return new Bitmap(temp);
            }
        }

        void RefreshClick(object sender, EventArgs e)
        {
            if (_busy) return;
            if (!_config.Configured)
            {
                MessageBox.Show(this, "Configure device connection in Settings first.", Text,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            ClearPhotoCache();
            int gen = Interlocked.Increment(ref _loadGeneration);
            SetBusy(true, "Loading users from device...");

            var settings = _config.ToDeviceSettings();
            ThreadPool.QueueUserWorkItem(_ =>
            {
                List<UserIdRecord> rows = null;
                string error = null;
                try
                {
                    string busy;
                    if (!DeviceGate.TryRun(() =>
                    {
                        // New refresh: drop any prior session and open one that stays
                        // connected for photo / rename / template until the form closes.
                        CloseSessionLocked();
                        try
                        {
                            rows = EnsureSessionLocked(settings).ListUsers(true);
                        }
                        catch
                        {
                            CloseSessionLocked();
                            throw;
                        }
                    }, 15000, out busy))
                    {
                        error = busy;
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                }

                if (IsDisposed) return;
                BeginInvoke(new Action(() =>
                {
                    if (IsDisposed || gen != _loadGeneration) return;
                    if (error != null)
                    {
                        _status.ForeColor = Color.Firebrick;
                        SetBusy(false, error);
                        MessageBox.Show(this, error, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }

                    _rows = rows ?? new List<UserIdRecord>();
                    BindGrid();
                    _status.ForeColor = Color.DimGray;
                    SetBusy(false, "Loaded " + _rows.Count + " enroll slot(s) from " + _config.Ip);
                }));
            });
        }

        void BindGrid()
        {
            string q = (_filter.Text ?? "").Trim();
            _view.RaiseListChangedEvents = false;
            _view.Clear();
            foreach (var r in _rows)
            {
                if (q.Length == 0
                    || r.EnrollNo.ToString().IndexOf(q, StringComparison.OrdinalIgnoreCase) >= 0
                    || (r.Name != null && r.Name.IndexOf(q, StringComparison.OrdinalIgnoreCase) >= 0)
                    || (r.BackupLabel != null && r.BackupLabel.IndexOf(q, StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    _view.Add(r);
                }
            }
            _view.RaiseListChangedEvents = true;
            _view.ResetBindings();
        }

        void ExportTemplateClick(object sender, EventArgs e)
        {
            if (_busy) return;
            var row = SelectedRow();
            if (row == null)
            {
                MessageBox.Show(this, "Select a row first.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            using (var dlg = new SaveFileDialog())
            {
                dlg.Filter = "Template (*.bin)|*.bin|All files (*.*)|*.*";
                dlg.FileName = "enroll_" + row.EnrollNo + "_" + row.BackupNo + ".bin";
                if (dlg.ShowDialog(this) != DialogResult.OK) return;

                string path = dlg.FileName;
                int enrollNo = row.EnrollNo;
                int backupNo = row.BackupNo;
                var settings = _config.ToDeviceSettings();
                SetBusy(true, "Exporting template...");

                ThreadPool.QueueUserWorkItem(_ =>
                {
                    string error = null;
                    try
                    {
                        string busy;
                        if (!DeviceGate.TryRun(() =>
                        {
                            EnrollTemplate t = EnsureSessionLocked(settings).GetEnrollData(enrollNo, backupNo);
                            UserExporter.WriteTemplateBin(t, path);
                        }, 15000, out busy))
                        {
                            error = busy;
                        }
                    }
                    catch (Exception ex)
                    {
                        error = ex.Message;
                    }

                    if (IsDisposed) return;
                    BeginInvoke(new Action(() =>
                    {
                        if (IsDisposed) return;
                        if (error != null)
                        {
                            SetBusy(false, error);
                            MessageBox.Show(this, error, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                            return;
                        }
                        _status.ForeColor = Color.DarkGreen;
                        SetBusy(false, "Exported " + Path.GetFileName(path));
                    }));
                });
            }
        }

        void ExportCsvClick(object sender, EventArgs e)
        {
            using (var dlg = new SaveFileDialog())
            {
                dlg.Filter = "CSV (*.csv)|*.csv";
                dlg.FileName = "users.csv";
                if (dlg.ShowDialog(this) != DialogResult.OK) return;
                try
                {
                    UserExporter.WriteCsv(_rows, dlg.FileName);
                    _status.ForeColor = Color.DarkGreen;
                    _status.Text = "Wrote " + dlg.FileName;
                }
                catch (Exception ex)
                {
                    MessageBox.Show(this, ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }
    }
}
