const fs = require('fs');
async function run() {
  const env = fs.readFileSync('.env.development', 'utf8');
  const projectMatch = env.match(/SUPABASE_PROJECT_ID="?([^"\n]+)"?/);
  const tokenMatch = env.match(/SUPABASE_ACCESS_TOKEN="?([^"\n]+)"?/);
  const projectId = projectMatch[1].trim();
  const token = tokenMatch[1].trim();
  
  const query = `
    SELECT id, name FROM standards WHERE name = 'Class X';
  `;
  
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
