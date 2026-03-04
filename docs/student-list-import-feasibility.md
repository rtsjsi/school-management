# Student List 2025-26.xls – Import Feasibility

## What the Excel file contains

- **Layout:** One sheet with a title block (rows 0–10), then repeated blocks of:
  - Section header: `Std :- <Standard> - <Division>` (e.g. `Std :- JR.KG. - A`, `Std :- 1 - B`)
  - Data rows with columns (by index):
    - **Col 1:** GR No. (string/number)
    - **Col 4:** Name
    - **Col 8:** Birth date (Excel serial date)
    - **Col 9:** Mobile
    - **Col 10:** Mobile - 2
    - **Col 12:** Cast (caste)
    - **Col 14:** Category (e.g. S.T, S.C, GENERAL)
    - **Col 16:** Gender (F / M)
    - **Col 17:** Address
- **Standards in file:** NUR, JR.KG., SR.KG., 1–11 (and section headers for 10, 11).
- **~501 student rows** (data rows with GR No and name).

## Mapping to our app’s student record

| App field            | In Excel? | Source / note |
|----------------------|-----------|----------------|
| full_name            | Yes       | Col 4 (Name) |
| date_of_birth        | Yes       | Col 8 (convert Excel date) |
| gender               | Yes       | Col 16 (F→female, M→male) |
| blood_group          | No        | Leave empty; fill later in app. |
| category             | Yes       | Col 14 (map S.T→st, S.C→sc, GENERAL→general, etc.) |
| religion             | No        | Leave empty; fill later. |
| caste                | Yes       | Col 12 (Cast) |
| district             | No        | Leave empty (only full address in col 17). |
| address              | Yes       | Col 17 |
| aadhar_no            | No        | Leave empty. |
| pen_no               | No        | Leave empty. |
| apaar_id             | No        | Leave empty. |
| udise_id             | No        | Leave empty. |
| gr_number            | Yes       | Col 1 (GR No.) |
| whatsapp_no          | Partial   | Use Mobile (col 9) or Mobile - 2 (col 10). |
| admission_type       | No        | Default `"regular"`. |
| academic_year        | No        | Default e.g. `"2025-26"` (configurable in script). |
| roll_number          | Yes       | Use GR No. (col 1). |
| grade                | Yes       | From section header (Std :- X - Y → X). |
| division             | Yes       | From section header (Y). |
| father_name          | No        | Leave empty. |
| mother_name          | No        | Leave empty. |
| parent_contact       | Yes       | Col 9 (Mobile); col 10 as alternate. |

## Conclusion

- **Feasible:** We can create student records from the file for: name, DOB, gender, category, caste, address, GR No., roll number, grade, division, parent/WhatsApp contact, and default admission type and academic year.
- **Not in file (must be filled later in the app or separately):** blood_group, religion, district, aadhar_no, pen_no, apaar_id, udise_id. The import script leaves these empty; users can complete them in the student edit form or via a follow-up process.

## Standard name mapping (file → app)

- NUR → Nursery  
- JR.KG. → Junior KG (LKG)  
- SR.KG. → Senior KG (UKG)  
- 1 … 12 → 1 … 12 (as in app)

Division is taken as the letter after the last `-` in the section header (e.g. A, B).
