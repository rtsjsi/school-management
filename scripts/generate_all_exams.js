const fs = require('fs');
const path = require('path');

async function getAdminId(projectId, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `SELECT id FROM public.profiles WHERE email = 'rtsjsi@gmail.com' LIMIT 1;` })
  });
  const data = await res.json();
  return data.length > 0 ? data[0].id : null;
}

async function getActiveAcademicYear(projectId, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `SELECT id FROM public.academic_years WHERE status = 'active' LIMIT 1;` })
  });
  const data = await res.json();
  return data.length > 0 ? data[0].id : null;
}

async function getStandards(projectId, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `SELECT id, name FROM public.standards;` })
  });
  return await res.json();
}

async function getSubjects(projectId, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `SELECT id, standard_id, evaluation_type FROM public.subjects;` })
  });
  return await res.json();
}

async function run() {
  const envMain = fs.readFileSync(path.join(__dirname, '..', '.env.development'), 'utf8');
  let projectId = '';
  let token = '';
  for (const line of envMain.split('\n')) {
    if (line.startsWith('SUPABASE_PROJECT_ID=')) projectId = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('SUPABASE_ACCESS_TOKEN=')) token = line.split('=')[1].trim().replace(/"/g, '');
  }

  const userId = await getAdminId(projectId, token);
  const ayId = await getActiveAcademicYear(projectId, token);
  const standards = await getStandards(projectId, token);
  const subjects = await getSubjects(projectId, token);
  
  if (!userId) {
    console.error("Missing User ID for rtsjsi@gmail.com");
    return;
  }
  if (!ayId) {
    console.error("Missing active Academic Year ID");
    return;
  }

  // Define standards based on Excel sheet groupings:
  // Nursery, LKG, UKG are omitted as per Excel sheets.
  const includedStandardNames = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI Science", "XII Science"];
  const targetStandards = standards.filter(s => includedStandardNames.includes(s.name));

  const terms = ["Term-1", "Term-2"];
  const examsConfig = [
    { name: "Class Test-1", mark_max: 20 },
    { name: "Class Test-2", mark_max: 20 },
    { name: "Project", mark_max: 30 },
    { name: "Written", mark_max: 80 }
  ];

  let sqlStatements = [];

  for (const std of targetStandards) {
    const stdSubjects = subjects.filter(s => s.standard_id === std.id);
    
    for (const term of terms) {
      for (const exam of examsConfig) {
        // Skip 'Class Test-1' for Standard 'I' in 'Term-1' as we already created it earlier
        if (std.name === 'I' && term === 'Term-1' && exam.name === 'Class Test-1') {
          continue;
        }
        
        sqlStatements.push(`
          DO $$
          DECLARE 
            v_exam_id UUID;
          BEGIN
            INSERT INTO public.exams (name, standard, term, academic_year_id, created_by, updated_by)
            VALUES ('${exam.name}', '${std.name}', '${term}', '${ayId}', '${userId}', '${userId}')
            RETURNING id INTO v_exam_id;
        `);

        if (stdSubjects.length > 0) {
          let subjectInserts = [];
          for (const sub of stdSubjects) {
            const maxMarks = sub.evaluation_type === 'mark' ? exam.mark_max : 100;
            subjectInserts.push(`(v_exam_id, '${sub.id}', ${maxMarks}, '${userId}', '${userId}')`);
          }
          
          sqlStatements.push(`
            INSERT INTO public.exam_subjects (exam_id, subject_id, max_marks, created_by, updated_by)
            VALUES ${subjectInserts.join(',\n              ')};
          `);
        }
        
        sqlStatements.push(`
          END $$;
        `);
      }
    }
  }

  const fullSql = sqlStatements.join('\n');
  
  // Apply using Management API (SOP Fallback)
  console.log("Applying batch migration via Management API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: fullSql })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error("Migration failed:", err);
    process.exit(1);
  }
  
  console.log("All exams added successfully!");
}

run();
