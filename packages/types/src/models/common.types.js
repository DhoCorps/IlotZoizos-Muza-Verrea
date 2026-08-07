// packages/types/src/models/common.types.ts
import { z } from 'zod';
export const STATUS_CONFIG = {
    CONCEPT: { label: '0', color: 'brown' },
    TODO: { label: 'TODO', color: 'gray' },
    IN_PROGRESS: { label: '...', color: 'blue' },
    DONE: { label: '!', color: 'green' },
    ARCHIVED: { label: 'M', color: 'purple' },
    BLOCKED: { label: 'B', color: 'orange' },
    ABANDONED: { label: 'X', color: 'red' }
};
// 🏗️ Le Pivot MongoDB / Neo4j (Version unifiée et flexible)
export const BaseNodeSchema = z.object({
    _id: z.string().optional(),
    uid: z.string().optional(),
    createdAt: z.union([z.date(), z.string()]).optional(),
    updatedAt: z.union([z.date(), z.string()]).optional(),
});
// 🛍️ Schéma e-commerce partagé entre les Sujets, les Partitions, etc.
export const MerchLinkSchema = z.object({
    productId: z.string(),
    sku: z.string().optional(),
    displayMode: z.enum(['card', 'inline', 'banner']).default('card'),
});
// 📊 Constantes Globales
export const ProjectStatusSchema = z.enum(['CONCEPT', 'PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'REDUCED_SPEED', 'ARCHIVED']);
export const ProjectPrioritySchema = z.enum(['TRIVIAL', 'EASY', 'MEDIUM', 'HARD', 'EXTREME', 'CRITICAL']);
// 👉 L'EXPORT MANQUANT POUR TASKS
export const ComplexityLevelSchema = z.number().min(1).max(10).default(1);
