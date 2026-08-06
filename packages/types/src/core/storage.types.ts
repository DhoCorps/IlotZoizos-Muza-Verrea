export type StorageEntityType = 
  | 'users'
  | 'teams'
  | 'projects'
  | 'tasks'
  | 'sujets'
  | 'products'
  | 'stores'
  | 'templates'
  | 'fonts'
  | 'partitas'
  | 'messages'
  | 'barters';

export interface StructuredKeyOptions {
  inceptId: string;
  locale: string;
  entityType: StorageEntityType;
  entityId: string;
  imageType: string;
  filename: string;
}