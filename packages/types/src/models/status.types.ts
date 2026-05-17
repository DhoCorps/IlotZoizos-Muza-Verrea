export interface IStatus {
  uid: string;         
  label: string;       
  // On verrouille les valeurs acceptées par la Silice
  value: 'CONCEPT' | 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'ARCHIVED' | 'REDUCED_SPEED' | 'CANCELLED';       
  color: string;       
  order: number;       
}