import mongoose, { Schema, Document } from 'mongoose';

export interface IBankReserve extends Document {
  currency: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  totalAmount: number;
  equilibriumThreshold: number; // Le volume idéal où l'économie est stable (Indice = 1.0)
  wealthIndex: number; // Propriété virtuelle calculée à la volée
}

const BankReserveSchema: Schema = new Schema(
  {
    currency: { 
      type: String, 
      required: true, 
      unique: true, // Une seule réserve par type de ressource
      enum: ['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes'] 
    },
    totalAmount: { 
      type: Number, 
      default: 0, 
      min: [0, 'La banque ne peut pas être à découvert'] 
    },
    equilibriumThreshold: { 
      type: Number, 
      required: true, 
      min: [1, 'Le seuil d\'équilibre doit être au moins de 1'] 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true }, // Permet d'inclure les virtuals dans les réponses JSON
    toObject: { virtuals: true }
  }
);

// 🧮 LA MAGIE Mongoose : Calcul dynamique de l'Indice de Richesse (I_banque)
BankReserveSchema.virtual('wealthIndex').get(function (this: IBankReserve) {
  // Si la banque a 2000 plumes et que le seuil est 1000, l'indice est de 2.0 (Banque très riche)
  // Si la banque a 500 plumes, l'indice est de 0.5 (Ressource rare)
  return this.totalAmount / this.equilibriumThreshold;
});

export const BankReserve = mongoose.models.BankReserve || mongoose.model<IBankReserve>('BankReserve', BankReserveSchema);