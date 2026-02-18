export const CATEGORIES = ["general", "obc", "sc", "st", "other"] as const;
export const ADMISSION_TYPES = ["regular", "transfer", "re-admission"] as const;

export type StudentFormState = {
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  address: string;
  society: string;
  district: string;
  grade: string;
  section: string;
  roll_number: string;
  admission_date: string;
  admission_form_no: string;
  admission_type: string;
  student_type: string;
  academic_year: string;
  status: string;
  category: string;
  religion: string;
  caste: string;
  birth_place: string;
  last_school: string;
  aadhar_no: string;
  unique_id: string;
  pen_no: string;
  apaar_id: string;
  father_name: string;
  mother_name: string;
  parent_contact: string;
  mother_contact: string;
  parent_email: string;
  parent_relationship: string;
  guardian_name: string;
  guardian_contact: string;
  guardian_email: string;
  fee_mafi_amount: string;
  fee_mafi_reason: string;
  all_fee_mafi: boolean;
  is_permanent: boolean;
  hostel_student: boolean;
  food_provided: boolean;
  prev_school_attendance: string;
  height: string;
  weight: string;
  handicap: boolean;
  minority: boolean;
  hobby: string;
  sign_of_identity: string;
  refer_name: string;
  father_birth_date: string;
  mother_birth_date: string;
  father_education: string;
  father_occupation: string;
  father_designation: string;
  mother_education: string;
  mother_occupation: string;
  mother_designation: string;
  parents_anniversary: string;
  whatsapp_no: string;
  yearly_income: string;
  fees_due_date: string;
  account_holder_name: string;
  bank_name: string;
  bank_branch: string;
  bank_ifsc: string;
  account_no: string;
  guardian_education: string;
  guardian_occupation: string;
  guardian_designation: string;
  transport_required: boolean;
  transport_route: string;
  transport_pickup_point: string;
  notes: string;
  is_rte_quota: boolean;
};

export function studentFormFromRecord(r: Record<string, unknown>): StudentFormState {
  return {
    full_name: (r.full_name as string) || "",
    email: (r.email as string) || "",
    phone_number: (r.phone_number as string) || "",
    date_of_birth: (r.date_of_birth as string) || "",
    gender: (r.gender as string) || "",
    blood_group: (r.blood_group as string) || "",
    address: (r.address as string) || "",
    society: (r.society as string) || "",
    district: (r.district as string) || "",
    grade: (r.grade as string) || "",
    section: (r.section as string) || "",
    roll_number: r.roll_number != null ? String(r.roll_number) : "",
    admission_date: (r.admission_date as string) || "",
    admission_form_no: (r.admission_form_no as string) || "",
    admission_type: (r.admission_type as string) || "regular",
    student_type: (r.student_type as string) || "new",
    academic_year: (r.academic_year as string) || "",
    status: (r.status as string) || "active",
    category: (r.category as string) || "",
    religion: (r.religion as string) || "",
    caste: (r.caste as string) || "",
    birth_place: (r.birth_place as string) || "",
    last_school: (r.last_school as string) || "",
    aadhar_no: (r.aadhar_no as string) || "",
    unique_id: (r.unique_id as string) || "",
    pen_no: (r.pen_no as string) || "",
    apaar_id: (r.apaar_id as string) || "",
    father_name: (r.father_name as string) || "",
    mother_name: (r.mother_name as string) || "",
    parent_contact: (r.parent_contact as string) || "",
    mother_contact: (r.mother_contact as string) || "",
    parent_email: (r.parent_email as string) || "",
    parent_relationship: (r.parent_relationship as string) || "father",
    guardian_name: (r.guardian_name as string) || "",
    guardian_contact: (r.guardian_contact as string) || "",
    guardian_email: (r.guardian_email as string) || "",
    fee_mafi_amount: r.fee_mafi_amount != null ? String(r.fee_mafi_amount) : "",
    fee_mafi_reason: (r.fee_mafi_reason as string) || "",
    all_fee_mafi: (r.all_fee_mafi as boolean) ?? false,
    is_permanent: (r.is_permanent as boolean) ?? false,
    hostel_student: (r.hostel_student as boolean) ?? false,
    food_provided: (r.food_provided as boolean) ?? false,
    prev_school_attendance: r.prev_school_attendance != null ? String(r.prev_school_attendance) : "",
    height: (r.height as string) || "",
    weight: (r.weight as string) || "",
    handicap: (r.handicap as boolean) ?? false,
    minority: (r.minority as boolean) ?? false,
    hobby: (r.hobby as string) || "",
    sign_of_identity: (r.sign_of_identity as string) || "",
    refer_name: (r.refer_name as string) || "",
    father_birth_date: (r.father_birth_date as string) || "",
    mother_birth_date: (r.mother_birth_date as string) || "",
    father_education: (r.father_education as string) || "",
    father_occupation: (r.father_occupation as string) || "",
    father_designation: (r.father_designation as string) || "",
    mother_education: (r.mother_education as string) || "",
    mother_occupation: (r.mother_occupation as string) || "",
    mother_designation: (r.mother_designation as string) || "",
    parents_anniversary: (r.parents_anniversary as string) || "",
    whatsapp_no: (r.whatsapp_no as string) || "",
    yearly_income: r.yearly_income != null ? String(r.yearly_income) : "",
    fees_due_date: (r.fees_due_date as string) || "",
    account_holder_name: (r.account_holder_name as string) || "",
    bank_name: (r.bank_name as string) || "",
    bank_branch: (r.bank_branch as string) || "",
    bank_ifsc: (r.bank_ifsc as string) || "",
    account_no: (r.account_no as string) || "",
    guardian_education: (r.guardian_education as string) || "",
    guardian_occupation: (r.guardian_occupation as string) || "",
    guardian_designation: (r.guardian_designation as string) || "",
    transport_required: (r.transport_required as boolean) ?? false,
    transport_route: (r.transport_route as string) || "",
    transport_pickup_point: (r.transport_pickup_point as string) || "",
    notes: (r.notes as string) || "",
    is_rte_quota: (r.is_rte_quota as boolean) ?? false,
  };
}

export function formToPayload(form: StudentFormState): Record<string, unknown> {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim() || null,
    phone_number: form.phone_number.trim() || null,
    date_of_birth: form.date_of_birth || null,
    gender: form.gender || null,
    blood_group: form.blood_group || null,
    address: form.address.trim() || null,
    society: form.society.trim() || null,
    district: form.district.trim() || null,
    grade: form.grade.trim() || null,
    section: form.section.trim() || null,
    roll_number: form.roll_number ? parseInt(form.roll_number) : null,
    admission_date: form.admission_date || null,
    admission_form_no: form.admission_form_no.trim() || null,
    admission_type: form.admission_type || null,
    student_type: form.student_type || null,
    academic_year: form.academic_year.trim() || null,
    status: form.status,
    category: (form.category && form.category !== "none") ? form.category : null,
    religion: form.religion.trim() || null,
    caste: form.caste.trim() || null,
    birth_place: form.birth_place.trim() || null,
    last_school: form.last_school.trim() || null,
    aadhar_no: form.aadhar_no.trim() || null,
    unique_id: form.unique_id.trim() || null,
    pen_no: form.pen_no.trim() || null,
    apaar_id: form.apaar_id.trim() || null,
    father_name: form.father_name.trim() || null,
    mother_name: form.mother_name.trim() || null,
    parent_name: form.father_name.trim() || form.mother_name.trim() || null,
    parent_contact: form.parent_contact.trim() || null,
    mother_contact: form.mother_contact.trim() || null,
    parent_email: form.parent_email.trim() || null,
    parent_relationship: form.parent_relationship,
    guardian_name: form.guardian_name.trim() || null,
    guardian_contact: form.guardian_contact.trim() || null,
    guardian_email: form.guardian_email.trim() || null,
    fee_mafi_amount: form.fee_mafi_amount ? parseFloat(form.fee_mafi_amount) : null,
    fee_mafi_reason: form.fee_mafi_reason.trim() || null,
    all_fee_mafi: form.all_fee_mafi,
    is_permanent: form.is_permanent,
    hostel_student: form.hostel_student,
    food_provided: form.food_provided,
    prev_school_attendance: form.prev_school_attendance ? parseInt(form.prev_school_attendance) : null,
    height: form.height.trim() || null,
    weight: form.weight.trim() || null,
    handicap: form.handicap,
    minority: form.minority,
    hobby: form.hobby.trim() || null,
    sign_of_identity: form.sign_of_identity.trim() || null,
    refer_name: form.refer_name.trim() || null,
    father_birth_date: form.father_birth_date || null,
    mother_birth_date: form.mother_birth_date || null,
    father_education: form.father_education.trim() || null,
    father_occupation: form.father_occupation.trim() || null,
    father_designation: form.father_designation.trim() || null,
    mother_education: form.mother_education.trim() || null,
    mother_occupation: form.mother_occupation.trim() || null,
    mother_designation: form.mother_designation.trim() || null,
    parents_anniversary: form.parents_anniversary || null,
    whatsapp_no: form.whatsapp_no.trim() || null,
    yearly_income: form.yearly_income ? parseFloat(form.yearly_income) : null,
    fees_due_date: form.fees_due_date || null,
    account_holder_name: form.account_holder_name.trim() || null,
    bank_name: form.bank_name.trim() || null,
    bank_branch: form.bank_branch.trim() || null,
    bank_ifsc: form.bank_ifsc.trim() || null,
    account_no: form.account_no.trim() || null,
    guardian_education: form.guardian_education.trim() || null,
    guardian_occupation: form.guardian_occupation.trim() || null,
    guardian_designation: form.guardian_designation.trim() || null,
    transport_required: form.transport_required,
    transport_route: form.transport_route.trim() || null,
    transport_pickup_point: form.transport_pickup_point.trim() || null,
    notes: form.notes.trim() || null,
    is_rte_quota: form.is_rte_quota,
  };
}
