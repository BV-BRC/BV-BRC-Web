export interface SessionFileDto {
  file_id?: string | null;
  file_name?: string | null;
  tool_id?: string | null;
  created_at?: string | null;
  last_accessed?: string | null;
  data_type?: string | null;
  size_bytes?: number | null;
  size_formatted?: string | null;
  record_count?: number | null;
  fields?: string[] | null;
  is_error?: boolean | null;
  workspace_path?: string | null;
  workspace_url?: string | null;
  query_parameters?: Record<string, unknown> | null;
}

export interface SessionFilesPagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SessionFileSummary {
  total_files: number;
  total_size_bytes: number;
}

export interface GetSessionFilesResponse {
  session_id: string;
  files: SessionFileDto[];
  pagination: SessionFilesPagination;
  summary: SessionFileSummary;
}

export interface SessionFileWorkspace {
  path?: string | null;
  url?: string | null;
}

export interface SessionFileCreatedPayload {
  iteration?: number;
  session_id: string;
  tool?: string | null;
  file: {
    file_id?: string | null;
    file_name?: string | null;
    is_error?: boolean | null;
    summary?: string | null;
    workspace?: SessionFileWorkspace | null;
  };
  timestamp?: string | null;
}

