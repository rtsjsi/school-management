/**
 * Master list of fee types for fee structures and collection LOV.
 * DB stores these codes on `fee_structure_items.fee_type` and `fee_collections.fee_type`.
 */
export const FEE_STRUCTURE_FEE_TYPE_CODES = [
  "education_fee",
  "transport_fee",
  "laboratory_fee",
  "sports_fee",
  "development_fee",
  "misc_fee",
] as const;

export type FeeStructureFeeTypeCode = (typeof FEE_STRUCTURE_FEE_TYPE_CODES)[number];
