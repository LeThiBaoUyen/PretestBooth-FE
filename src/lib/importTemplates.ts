export const IMPORT_TEMPLATE_URLS = {
  questionCsv: "/templates/question-import-template.csv",
  questionXlsx: "/templates/question-import-template.xlsx",
  problemCsv: "/templates/problem-import-template.csv",
  problemXlsx: "/templates/problem-import-template.xlsx",
  studentCsv: "/templates/student-import-template.csv",
  studentXlsx: "/templates/student-import-template.xlsx",
} as const;

export type ImportTemplateKey = keyof typeof IMPORT_TEMPLATE_URLS;

export function downloadImportTemplate(templateKey: ImportTemplateKey, fileName: string) {
  const href = IMPORT_TEMPLATE_URLS[templateKey];
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
