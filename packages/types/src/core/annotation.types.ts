export type AnnotationTargetType = 'BOOK' | 'ARTICLE' | 'COMMENT';

export interface IUniversalAnnotation {
  uid: string;
  targetUid: string;
  targetType: AnnotationTargetType;
  targetTitle?: string;
  authorUid: string;
  selectedText: string;
  comment?: string;
  importance?: number;
  emotion?: string;
  chapterReference?: string | null;
  isScholarSealed?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ICreateUniversalAnnotationInput {
  targetUid: string;
  targetType: AnnotationTargetType;
  targetTitle?: string;
  selectedText: string;
  comment?: string;
  importance?: number;
  emotion?: string;
  chapterReference?: string | null;
}