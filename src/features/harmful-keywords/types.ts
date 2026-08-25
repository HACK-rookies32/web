export interface HarmfulKeyword {
  id: number;
  keyword: string;
  createdAt: string;
}

export interface HarmfulKeywordCreateRequest {
  keyword: string;
}
