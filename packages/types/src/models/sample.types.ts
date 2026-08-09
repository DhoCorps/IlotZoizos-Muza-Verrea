export interface ISamplePermissions {
  allowRadio: boolean;
  allowBlindTest: boolean;
  allowShowcase: boolean;
}

export interface ISample {
  uid: string;
  title: string;
  slug: string;
  audioUrl: string;
  storageKey: string;
  tempoBpm: number;
  musicalKey: string; // ex: 'A minor', 'C major'
  style: string;      // ex: 'Cyberpunk', 'Ambient', 'Techno'
  creatorUid: string;
  creatorSlug: string;
  permissions: ISamplePermissions;
  createdAt: Date;
}