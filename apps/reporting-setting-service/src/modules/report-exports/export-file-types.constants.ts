export const EXPORT_FILE_TYPES = ['XLSX'] as const;

export type ExportFileType = (typeof EXPORT_FILE_TYPES)[number];
