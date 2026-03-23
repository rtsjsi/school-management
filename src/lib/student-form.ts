export const CATEGORIES = ["general", "obc", "sc", "st", "other"] as const;

export const IN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type StructuredAddress = {
  line1: string;
  line2: string;
  city: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
};

export function stringifyAddress(a: Partial<StructuredAddress>): string {
  const parts = [
    a.line1,
    a.line2,
    a.city,
    a.taluka,
    a.district,
    a.state,
    a.pincode,
    a.country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
}

export type StudentFormState = {
  full_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  present_address_line1: string;
  present_address_line2: string;
  present_city: string;
  present_taluka: string;
  present_district: string;
  present_state: string;
  present_pincode: string;
  present_country: string;
  permanent_same_as_present: boolean;
  permanent_address_line1: string;
  permanent_address_line2: string;
  permanent_city: string;
  permanent_taluka: string;
  permanent_district: string;
  permanent_state: string;
  permanent_pincode: string;
  permanent_country: string;
  mother_tongue: string;
  standard: string;
  division: string;
  roll_number: string;
  admission_date: string;
  status: string;
  category: string;
  religion: string;
  caste: string;
  birth_place: string;
  last_school: string;
  previous_school_address: string;
  previous_school_state_unique_id: string;
  birth_certificate_number: string;
  aadhar_no: string;
  pen_no: string;
  apaar_id: string;
  father_name: string;
  mother_name: string;
  parent_contact: string;
  mother_contact: string;
  parent_email: string;
  guardian_name: string;
  guardian_contact: string;
  guardian_email: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  fee_concession_amount: string;
  fee_concession_reason: string;
  height: string;
  weight: string;
  hobby: string;
  sign_of_identity: string;
  father_education: string;
  father_occupation: string;
  mother_education: string;
  mother_occupation: string;
  whatsapp_no: string;
  account_holder_name: string;
  bank_name: string;
  bank_branch: string;
  bank_ifsc: string;
  account_no: string;
  guardian_education: string;
  guardian_occupation: string;
  udise_id: string;
  gr_number: string;
  second_language: string;
  is_rte_quota: boolean;
};

export function studentFormFromRecord(r: Record<string, unknown>): StudentFormState {
  return {
    full_name: (r.full_name as string) || "",
    date_of_birth: (r.date_of_birth as string) || "",
    gender: (r.gender as string) || "",
    blood_group: (r.blood_group as string) || "",
    present_address_line1: (r.present_address_line1 as string) || "",
    present_address_line2: (r.present_address_line2 as string) || "",
    present_city: (r.present_city as string) || "",
    present_taluka: (r.present_taluka as string) || "",
    present_district: (r.present_district as string) || "",
    present_state: (r.present_state as string) || "",
    present_pincode: (r.present_pincode as string) || "",
    present_country: (r.present_country as string) || "India",
    permanent_same_as_present: false,
    permanent_address_line1: (r.permanent_address_line1 as string) || "",
    permanent_address_line2: (r.permanent_address_line2 as string) || "",
    permanent_city: (r.permanent_city as string) || "",
    permanent_taluka: (r.permanent_taluka as string) || "",
    permanent_district: (r.permanent_district as string) || "",
    permanent_state: (r.permanent_state as string) || "",
    permanent_pincode: (r.permanent_pincode as string) || "",
    permanent_country: (r.permanent_country as string) || "India",
    mother_tongue: (r.mother_tongue as string) || "",
    standard: (r.standard as string) || "",
    division: (r.division as string) || "",
    roll_number: r.roll_number != null ? String(r.roll_number) : "",
    admission_date: (r.admission_date as string) || "",
    status: (r.status as string) || "active",
    category: (r.category as string) || "",
    religion: (r.religion as string) || "",
    caste: (r.caste as string) || "",
    birth_place: (r.birth_place as string) || "",
    last_school: (r.last_school as string) || "",
    previous_school_address: (r.previous_school_address as string) || "",
    previous_school_state_unique_id: (r.previous_school_state_unique_id as string) || "",
    birth_certificate_number: (r.birth_certificate_number as string) || "",
    aadhar_no: (r.aadhar_no as string) || "",
    pen_no: (r.pen_no as string) || "",
    apaar_id: (r.apaar_id as string) || "",
    father_name: (r.father_name as string) || "",
    mother_name: (r.mother_name as string) || "",
    parent_contact: (r.parent_contact as string) || "",
    mother_contact: (r.mother_contact as string) || "",
    parent_email: (r.parent_email as string) || "",
    guardian_name: (r.guardian_name as string) || "",
    guardian_contact: (r.guardian_contact as string) || "",
    guardian_email: (r.guardian_email as string) || "",
    emergency_contact_name: (r.emergency_contact_name as string) || "",
    emergency_contact_number: (r.emergency_contact_number as string) || "",
    fee_concession_amount: r.fee_concession_amount != null ? String(r.fee_concession_amount) : "",
    fee_concession_reason: (r.fee_concession_reason as string) || "",
    height: (r.height as string) || "",
    weight: (r.weight as string) || "",
    hobby: (r.hobby as string) || "",
    sign_of_identity: (r.sign_of_identity as string) || "",
    father_education: (r.father_education as string) || "",
    father_occupation: (r.father_occupation as string) || "",
    mother_education: (r.mother_education as string) || "",
    mother_occupation: (r.mother_occupation as string) || "",
    whatsapp_no: (r.whatsapp_no as string) || "",
    account_holder_name: (r.account_holder_name as string) || "",
    bank_name: (r.bank_name as string) || "",
    bank_branch: (r.bank_branch as string) || "",
    bank_ifsc: (r.bank_ifsc as string) || "",
    account_no: (r.account_no as string) || "",
    guardian_education: (r.guardian_education as string) || "",
    guardian_occupation: (r.guardian_occupation as string) || "",
    udise_id: (r.udise_id as string) || "",
    gr_number: (r.gr_number as string) || "",
    second_language: (r.second_language as string) || "",
    is_rte_quota: (r.is_rte_quota as boolean) ?? false,
  };
}

export function formToPayload(form: StudentFormState): Record<string, unknown> {
  const present: StructuredAddress = {
    line1: form.present_address_line1,
    line2: form.present_address_line2,
    city: form.present_city,
    taluka: form.present_taluka,
    district: form.present_district,
    state: form.present_state,
    pincode: form.present_pincode,
    country: form.present_country || "India",
  };

  const permanentSource = form.permanent_same_as_present
    ? present
    : ({
        line1: form.permanent_address_line1,
        line2: form.permanent_address_line2,
        city: form.permanent_city,
        taluka: form.permanent_taluka,
        district: form.permanent_district,
        state: form.permanent_state,
        pincode: form.permanent_pincode,
        country: form.permanent_country || "India",
      } satisfies StructuredAddress);

  return {
    full_name: form.full_name.trim(),
    date_of_birth: form.date_of_birth || null,
    gender: form.gender || null,
    blood_group: form.blood_group || null,
    mother_tongue: form.mother_tongue.trim() || null,
    present_address_line1: present.line1.trim() || null,
    present_address_line2: present.line2.trim() || null,
    present_city: present.city.trim() || null,
    present_taluka: present.taluka.trim() || null,
    present_district: present.district.trim() || null,
    present_state: present.state.trim() || null,
    present_pincode: present.pincode.trim() || null,
    present_country: (present.country || "India").trim() || "India",
    permanent_address_line1: permanentSource.line1.trim() || null,
    permanent_address_line2: permanentSource.line2.trim() || null,
    permanent_city: permanentSource.city.trim() || null,
    permanent_taluka: permanentSource.taluka.trim() || null,
    permanent_district: permanentSource.district.trim() || null,
    permanent_state: permanentSource.state.trim() || null,
    permanent_pincode: permanentSource.pincode.trim() || null,
    permanent_country: (permanentSource.country || "India").trim() || "India",
    standard: form.standard.trim() || null,
    division: form.division.trim() || null,
    roll_number: form.roll_number ? parseInt(form.roll_number) : null,
    admission_date: form.admission_date || null,
    status: form.status,
    category: (form.category && form.category !== "none") ? form.category : null,
    religion: form.religion.trim() || null,
    caste: form.caste.trim() || null,
    birth_place: form.birth_place.trim() || null,
    last_school: form.last_school.trim() || null,
    previous_school_address: form.previous_school_address.trim() || null,
    previous_school_state_unique_id: form.previous_school_state_unique_id.trim() || null,
    birth_certificate_number: form.birth_certificate_number.trim() || null,
    aadhar_no: form.aadhar_no.trim() || null,
    pen_no: form.pen_no.trim() || null,
    apaar_id: form.apaar_id.trim() || null,
    father_name: form.father_name.trim() || null,
    mother_name: form.mother_name.trim() || null,
    parent_name: form.father_name.trim() || form.mother_name.trim() || null,
    parent_contact: form.parent_contact.trim() || null,
    mother_contact: form.mother_contact.trim() || null,
    parent_email: form.parent_email.trim() || null,
    guardian_name: form.guardian_name.trim() || null,
    guardian_contact: form.guardian_contact.trim() || null,
    guardian_email: form.guardian_email.trim() || null,
    emergency_contact_name: form.emergency_contact_name.trim() || null,
    emergency_contact_number: form.emergency_contact_number.trim() || null,
    fee_concession_amount: form.fee_concession_amount ? parseFloat(form.fee_concession_amount) : null,
    fee_concession_reason: form.fee_concession_reason.trim() || null,
    height: form.height.trim() || null,
    weight: form.weight.trim() || null,
    hobby: form.hobby.trim() || null,
    sign_of_identity: form.sign_of_identity.trim() || null,
    father_education: form.father_education.trim() || null,
    father_occupation: form.father_occupation.trim() || null,
    mother_education: form.mother_education.trim() || null,
    mother_occupation: form.mother_occupation.trim() || null,
    whatsapp_no: form.whatsapp_no.trim() || null,
    account_holder_name: form.account_holder_name.trim() || null,
    bank_name: form.bank_name.trim() || null,
    bank_branch: form.bank_branch.trim() || null,
    bank_ifsc: form.bank_ifsc.trim() || null,
    account_no: form.account_no.trim() || null,
    guardian_education: form.guardian_education.trim() || null,
    guardian_occupation: form.guardian_occupation.trim() || null,
    udise_id: form.udise_id.trim() || null,
    gr_number: form.gr_number.trim() || null,
    second_language: form.second_language || null,
    is_rte_quota: form.is_rte_quota,
  };
}
