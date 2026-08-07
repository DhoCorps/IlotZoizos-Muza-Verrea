// packages/types/src/permissions.types.ts
import { z } from 'zod';
// 🔥 LES PARTICULES ÉLÉMENTAIRES (Les vraies capacités mécaniques de l'Îlot)
export const CAPABILITIES = {
    TEAM: { CREATE: 'team:create', READ: 'team:read', UPDATE: 'team:update', DELETE: 'team:delete', MANAGE: 'team:manage-members' },
    MEMBER: { INVITE: 'member:invite', READ: 'member:read', LIST: 'member:list', UPDATE: 'member:update', EXILE: 'member:exile' },
    PROJECT: { CREATE: 'project:create', READ: 'project:read', UPDATE: 'project:update', DELETE: 'project:delete', ARCHIVE: 'project:archive' },
    TASK: { CREATE: 'task:create', READ: 'task:read', UPDATE: 'task:update', DELETE: 'task:delete', MOVE: 'task:move' },
    FILE: { UPLOAD: 'file:upload', READ: 'file:read', UPDATE: 'file:update', DOWNLOAD: 'file:download', BURN: 'file:burn' },
    BLOG: { CREATE: 'blog:create', READ: 'blog:read', UPDATE: 'blog:update', DELETE: 'blog:delete', PUBLISH: 'blog:publish' },
    PARTITA: { CREATE: 'partita:create', READ: 'partita:read', UPDATE: 'partita:update', DELETE: 'partita:delete' },
    ECOMMERCE: { STORE_CREATE: 'ecommerce:store-create', PRODUCT_CREATE: 'ecommerce:product-create', BARTER_PROPOSE: 'ecommerce:barter-propose', MANAGE: 'ecommerce:manage' },
    LETRIN: { CREATE: 'letrin:create', READ: 'letrin:read', UPDATE: 'letrin:update', DELETE: 'letrin:delete', FORGE: 'letrin:forge' },
    KONTAKT: { CONNECT: 'kontakt:connect', READ: 'kontakt:read', UPDATE: 'kontakt:update', DELETE: 'kontakt:delete', SYNC: 'kontakt:sync' },
    SYSTEM: { MONITOR: 'wellbeing:monitor', MODERATE: 'moderation:execute', ALL: '*' }
};
// Un simple validateur Zod pour s'assurer qu'une permission envoyée existe bien
export const CapabilitySchema = z.string();
export const POWER_LEVELS = {
    TEAM: {
        label: 'Administration du Nid',
        capabilities: [CAPABILITIES.TEAM.CREATE, CAPABILITIES.TEAM.READ, CAPABILITIES.TEAM.UPDATE, CAPABILITIES.TEAM.DELETE, CAPABILITIES.TEAM.MANAGE]
    },
    MEMBER: {
        label: 'Gestion de la Volée',
        capabilities: [CAPABILITIES.MEMBER.INVITE, CAPABILITIES.MEMBER.READ, CAPABILITIES.MEMBER.LIST, CAPABILITIES.MEMBER.UPDATE, CAPABILITIES.MEMBER.EXILE]
    },
    PROJECT: {
        label: 'Fragments (Projets)',
        capabilities: [CAPABILITIES.PROJECT.CREATE, CAPABILITIES.PROJECT.READ, CAPABILITIES.PROJECT.UPDATE, CAPABILITIES.PROJECT.DELETE, CAPABILITIES.PROJECT.ARCHIVE]
    },
    TASK: {
        label: 'Tâches Opérationnelles',
        capabilities: [CAPABILITIES.TASK.CREATE, CAPABILITIES.TASK.READ, CAPABILITIES.TASK.UPDATE, CAPABILITIES.TASK.DELETE, CAPABILITIES.TASK.MOVE]
    },
    FILE: {
        label: 'Archives & Fichiers',
        capabilities: [CAPABILITIES.FILE.UPLOAD, CAPABILITIES.FILE.READ, CAPABILITIES.FILE.UPDATE, CAPABILITIES.FILE.DOWNLOAD, CAPABILITIES.FILE.BURN]
    },
    BLOG: {
        label: 'Abyss Blog & Sujets',
        capabilities: [CAPABILITIES.BLOG.CREATE, CAPABILITIES.BLOG.READ, CAPABILITIES.BLOG.UPDATE, CAPABILITIES.BLOG.DELETE, CAPABILITIES.BLOG.PUBLISH]
    },
    PARTITA: {
        label: 'Partitions (Partita)',
        capabilities: [CAPABILITIES.PARTITA.CREATE, CAPABILITIES.PARTITA.READ, CAPABILITIES.PARTITA.UPDATE, CAPABILITIES.PARTITA.DELETE]
    },
    ECOMMERCE: {
        label: 'Boutique & Troc Harmonique',
        capabilities: [CAPABILITIES.ECOMMERCE.STORE_CREATE, CAPABILITIES.ECOMMERCE.PRODUCT_CREATE, CAPABILITIES.ECOMMERCE.BARTER_PROPOSE, CAPABILITIES.ECOMMERCE.MANAGE]
    },
    LETRIN: {
        label: 'Forge Typographique (Letr\'In)',
        capabilities: [CAPABILITIES.LETRIN.CREATE, CAPABILITIES.LETRIN.READ, CAPABILITIES.LETRIN.UPDATE, CAPABILITIES.LETRIN.DELETE, CAPABILITIES.LETRIN.FORGE]
    },
    KONTAKT: {
        label: 'Réseau & Connexions (Kontakt-RH)',
        capabilities: [CAPABILITIES.KONTAKT.CONNECT, CAPABILITIES.KONTAKT.READ, CAPABILITIES.KONTAKT.UPDATE, CAPABILITIES.KONTAKT.DELETE, CAPABILITIES.KONTAKT.SYNC]
    }
};
