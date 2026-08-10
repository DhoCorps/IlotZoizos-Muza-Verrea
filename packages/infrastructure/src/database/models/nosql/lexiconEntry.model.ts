import { Schema, model, models, Document } from 'mongoose';

export interface ILexiconEntry extends Document {
    uid: string;           // ex: lex_fr_oiseau
    language: 'fr' | 'en' | 'es';
    word: string;          // "oiseau"
    phoneticIpa: string;   // "/wa.zo/"
    syllableCount: number; // 2
    definitions: {
        fr?: string;
        en?: string;
        es?: string;
    };
    partOfSpeech: 'noun' | 'verb' | 'adjective' | 'jective';
}

const LexiconEntrySchema = new Schema<ILexiconEntry>({
    uid: { type: String, required: true, unique: true, index: true },
    language: { type: String, required: true, enum: ['fr', 'en', 'es'], index: true },
    word: { type: String, required: true, index: true, lowercase: true, trim: true },
    phoneticIpa: { type: String, required: true },
    syllableCount: { type: Number, required: true, min: 1 },
    definitions: {
        fr: { type: String },
        en: { type: String },
        es: { type: String }
    },
    partOfSpeech: { 
        type: String, 
        required: true, 
        enum: ['noun', 'verb', 'adjective', 'jective'],
        index: true 
    }
}, {
    timestamps: true
});

// Indexation composée pour accélérer les requêtes d'Univers'Hall
LexiconEntrySchema.index({ language: 1, partOfSpeech: 1 });
LexiconEntrySchema.index({ word: 1, language: 1 }, { unique: true });

export const LexiconEntryModel = models.LexiconEntry || model<ILexiconEntry>('LexiconEntry', LexiconEntrySchema);