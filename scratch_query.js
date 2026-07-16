const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: standards, error: err1 } = await supabase.from('standards').select('id, name');
  if (err1) {
    console.error('Error fetching standards:', err1);
    return;
  }
  
  const { data: subjects, error: err2 } = await supabase.from('subjects').select('name, standard_id, evaluation_type');
  if (err2) {
    console.error('Error fetching subjects:', err2);
    return;
  }

  const standardsMap = {};
  standards.forEach(s => {
    standardsMap[s.id] = s.name;
  });

  const subjectsByStandard = {};
  subjects.forEach(s => {
    const stdName = standardsMap[s.standard_id];
    if (!subjectsByStandard[stdName]) {
      subjectsByStandard[stdName] = { scholastic: [], coScholastic: [] };
    }
    if (s.evaluation_type === 'Marks' || s.evaluation_type === 'Marks_and_Grade' || s.evaluation_type === 'marks') {
      subjectsByStandard[stdName].scholastic.push(s.name);
    } else {
      subjectsByStandard[stdName].coScholastic.push(s.name);
    }
  });

  console.log(JSON.stringify(subjectsByStandard, null, 2));
}

run();
