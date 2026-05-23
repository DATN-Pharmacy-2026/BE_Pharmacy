export const EXPORT_FILE_TYPES = ['XLSX', 'CSV'] as const;

export type ExportFileType = (typeof EXPORT_FILE_TYPES)[number];
