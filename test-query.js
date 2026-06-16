const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lmevpzxbwojrzfxtxxgy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZXZwenhid29qcnpmeHR4eGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjQ4MDAsImV4cCI6MjA4NjU0MDgwMH0.fr3kWc8TNYrwNYoGBe6Hm-gIFOmsHvjj_XboD3k0DV0'
);

async function test() {
  const { data, error } = await supabase
    .from("fee_collections")
    .select(
      "id, receipt_number, amount, fee_type, quarter, academic_year, payment_mode, collection_date, collected_by, modified_by, cheque_number, cheque_bank, cheque_date, online_transaction_id, online_transaction_ref, students(full_name, standard, division, roll_number, gr_number), collector:profiles!collected_by(full_name)"
    ).limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success data:", data);
  }
}

test();
