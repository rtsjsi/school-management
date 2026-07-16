const fs = require('fs');
const file = 'src/components/ReportCardGenerator.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[selectedExamId, setSelectedExamId\] = useState\(\"\"\);/,
  \const [reportType, setReportType] = useState<"single" | "term-1" | "term-2" | "annual">("single");
  const [selectedExamId, setSelectedExamId] = useState("");\
);

// We should also import generateMultiExamReportCardPDF
content = content.replace(
  /import { generateReportCardPDF } from "@\/lib\/report-card-pdf";/,
  \import { generateReportCardPDF, generateMultiExamReportCardPDF } from "@/lib/report-card-pdf";\
);

fs.writeFileSync(file, content);
console.log("Updated state declarations.");
