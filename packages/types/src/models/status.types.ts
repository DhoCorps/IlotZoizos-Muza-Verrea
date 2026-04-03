export interface IStatus {
  uid: string;         // Identifiant unique du Nexus
  label: string;       // Ce que l'oiseau voit (ex: "En vol", "Au nid")
  value: string;       // La valeur brute pour la Silice (ex: "in_progress", "done")
  color: string;       // Code Hexa ou classe CSS pour l'interface
  order: number;       // Pour que tes colonnes Kanban restent bien alignées
}