## Manual Test Use Cases

This document lists practical end-to-end flows you can use to manually test the School Management application.

---

## 1. Student & Enrollment Management

### 1.1 Student master data
- **Add new student**
  - Navigate to the student entry form.
  - Create a student in a lower standard (e.g. Std 1) with division (e.g. A).
  - Mark one student as RTE quota and one as regular.
  - Verify:
    - Student appears in student lists and filters by standard/division.
    - RTE flag appears where expected.
- **Edit existing student**
  - Change standard/division (e.g. 1A → 2B).
  - Update contact/guardian details.
  - Verify lists, filters, and report data reflect the new class and details.
- **Deactivate / reactivate student**
  - Deactivate a student.
  - Verify they are excluded from:
    - New fee collections.
    - Marks entry / exam student lists.
    - Outstanding and other student-based reports.
  - Reactivate and confirm they appear again.

### 1.2 Promotion
- **Run promotion**
  - At the end of an academic year, select source standard/division and target.
  - Promote a batch of students (with some excluded).
  - Verify:
    - Promoted students appear in the new standard/division.
    - Excluded students remain in the original class.

### 1.3 Student documents & photos
- **Upload documents**
  - Attach PDFs/images (e.g. birth certificate, previous report cards).
  - Verify:
    - Files upload successfully and show with correct names.
    - You can download/open them.
- **Upload/update photo**
  - Capture via camera (where supported) and via file upload.
  - Replace an existing photo.
  - Verify the new photo shows on student details and any screens that display photos.
- **Delete document/photo**
  - Delete a document and a photo.
  - Verify they no longer appear and cannot be opened.

---

## 2. Academic Structure & Exams

### 2.1 Standards / divisions / academic years
- **Manage standards and divisions**
  - Create a new standard and a new division.
  - Edit names and sort order.
  - Verify:
    - New standard/division appears in dropdowns across student, fee, and exam screens.
    - Sort order is respected in selectors.
- **Academic years**
  - Add an academic year and mark it as active.
  - Switch the active academic year.
  - Verify:
    - Forms default to the active year where applicable.
    - Reports that allow academic year selection use correct defaults.

### 2.2 Subjects & exam configuration
- **Subject master**
  - Create subjects for a standard (mix of marks-based and grade-based).
  - Edit subject names and evaluation type.
  - Verify:
    - Subjects appear in exam subject configuration.
    - Evaluation type (marks vs grade) drives UI (marks field vs grade dropdown).
- **Exam configuration**
  - Create exams for different standards (e.g. Unit Test, Term 1).
  - Configure exam-subject mapping with max marks per subject.
  - Verify:
    - Only mapped subjects appear when entering marks for that exam.
    - Max marks show correctly in marks entry UI.

### 2.3 Marks entry
- **Single-subject marks entry**
  - Select an exam and subject.
  - Enter marks for multiple students, including:
    - Full marks, zero, and middle-range scores.
    - At least one absent student.
  - Save and reload the page.
  - Verify:
    - All scores/absence flags are persisted.
    - Overall totals/grades (if shown) look correct.
- **Multiple-subjectwise marks entry**
  - Load a standard/division with multiple subjects for a given exam.
  - Enter marks/grades for several students and subjects.
  - Mark a student absent in one subject and present in others.
  - Save and reload.
  - Verify:
    - Per-subject data persists correctly.
    - Grade-based subjects show and save grades instead of marks.

---

## 3. Fees & Finance

### 3.1 Fee structure
- **Configure fee structure**
  - For one academic year, set fee items (e.g. Tuition, Term Fee) per standard and per quarter.
  - Change an amount and save.
  - Verify:
    - New collections created after the change use the updated amount.
    - Existing historical collections retain their original amounts.

### 3.2 Fee collection
- **Collect fee (cash)**
  - Choose a student with a clear fee structure.
  - Let the system suggest amount from fee structure and collect full fee in cash.
  - Verify:
    - Receipt number is generated and unique.
    - Fee collection list/report shows the transaction with correct mode and amount.
- **Collect fee (cheque)**
  - Record payment by cheque:
    - Fill cheque number, bank, date.
  - Verify:
    - Details appear on the receipt and in fee reports.
    - Receipt PDF includes cheque info where expected.
- **Collect fee (online)**
  - Record payment using online mode:
    - Enter transaction ID/reference.
  - Verify:
    - Online details saved and visible on receipt and reports.
- **Partial and multiple payments**
  - Pay part of a quarter’s fees for a student, then pay remaining later.
  - Verify:
    - Outstanding report shows reduced outstanding after first payment, zero after full payment.
    - Fee reports show both receipts correctly.

### 3.3 Receipts & fee reporting
- **Receipt PDF**
  - Generate receipt PDF for a recent payment.
  - Verify:
    - School name, logo, address, contact details.
    - Student name, standard/division, GR number.
    - Amount (numeric and in words), fee type, quarter, payment mode, date.
- **Fee collection list/report**
  - Filter by:
    - Date range (e.g. current month).
    - Academic year, quarter, standard, fee type.
  - Export/print if available.
  - Verify totals match individual receipts.

### 3.4 Outstanding & defaulters
- **Outstanding report by class**
  - For a given academic year and quarter:
    - Generate outstanding report for one standard/division.
  - Verify:
    - RTE quota students are excluded where they should not be charged.
    - Totals per student and grand total look reasonable vs fee structure and receipts.
- **Outstanding by student**
  - Filter by a specific student.
  - Verify:
    - All unpaid quarters/fee types are listed.
    - After paying, the same report shows updated or zero outstanding.

---

## 4. Reporting & Documents

### 4.1 Outstanding & fee reports
- **Cross-check fee vs outstanding**
  - For a sample student, manually compute:
    - Sum of fee structure items.
    - Sum of receipts.
    - Expected outstanding = structure total − receipts total.
  - Verify the outstanding report and fee reports match this manual calculation.

### 4.2 Report cards
- **Generate report card PDF**
  - Choose:
    - One exam with marks-based subjects.
    - One exam with grade-based subjects.
  - Generate report card for a student with:
    - Full data (all subjects present).
    - Some absences or missing marks.
  - Verify:
    - Subjects, marks/grades, totals, and remarks render correctly.
    - Academic year, exam name, standard/division, roll number, GR number.
    - School logo and settings appear properly.

### 4.3 Payslips & salary (if used)
- **Salary deductions and payslip**
  - Configure deduction heads and base salary for an employee.
  - Generate a payslip for a month.
  - Verify:
    - Earnings, deductions, and net pay are correctly computed.
    - Payslip PDF (if available) has all expected fields.

---

## 5. Settings, Access & Navigation

### 5.1 School settings
- **School profile**
  - Update school name, address, phone, email, and logo.
  - Verify changes appear on:
    - Dashboard headers (if applicable).
    - Receipts and report cards.
- **Logo handling**
  - Upload a large logo and verify it scales/clips correctly in PDFs.

### 5.2 Class access and roles
- **Class access**
  - For a non-admin user, configure allowed standards/divisions.
  - Log in as that user and verify:
    - Only allowed classes appear in filters and lists.
    - Exams, marks entry, report card generator, and fee reports are restricted accordingly.

### 5.3 Navigation
- **Sidebar & top-level flows**
  - Ensure main flows work end-to-end without broken links:
    - Students → create/edit → documents/photos.
    - Fees → structure → collection → receipts → reports/outstanding.
    - Exams → subjects → exam config → marks entry → report card.

---

## 6. Data Import & Utilities

### 6.1 Student import from template/XLS
- **Dry run**
  - Run import in dry-run mode using sample template.
  - Verify:
    - Validation errors are surfaced (missing standard, invalid division, duplicates).
    - No data is actually written.
- **Actual import**
  - Run the same file without dry-run.
  - Verify:
    - Students are created with correct standard/division and IDs.
    - Imported students appear in lists, fee, and exam flows.

### 6.2 Seed script (for demo environments)
- **Seeding**
  - On a fresh database, run the seed script.
  - Verify:
    - Base data (standards, divisions, sample students, fee structures) is created.
    - You can immediately run through the major flows above using seeded data.

---

You can work through these sections one by one when testing new deployments or features. Checkboxes in your own notes or issue tracker work well to track which flows you’ve already validated for a given release.

