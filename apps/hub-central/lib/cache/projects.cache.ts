// Fichier : lib/cache/projects.cache.ts
import { unstable_cache } from 'next/cache';
import { ProjectModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Récupération des projets optimisée (La Clairière)
// -------------------------------------------------------------------------
export const getCachedProjects = (userUid?: string, requestedOwnerUid?: string, myProjectUids: string[] = []) => {
  return unstable_cache(
    async () => {
      const baseOrCondition = [
        { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } }, 
        { uid: { $in: myProjectUids } }
      ];

      const queryFilter: Record<string, unknown> = requestedOwnerUid
        ? {
            $and: [
              { ownerUid: requestedOwnerUid },
              { $or: baseOrCondition }
            ]
          }
        : {
            $or: baseOrCondition
          };

      return await ProjectModel.find(queryFilter)
        .select('-moderation.internalNotes') 
        .sort({ 'dates.lastActivity': -1 })
        .limit(50)
        .lean();
    },
    [`projects-list-${userUid || 'public'}-${requestedOwnerUid || 'all'}-${myProjectUids.join(',')}`],
    { revalidate: 60, tags: ['projects', `projects-user-${userUid || 'public'}`] }
  )();
};

// -------------------------------------------------------------------------
// CACHE : Récupération des détails d'un projet spécifique
// -------------------------------------------------------------------------
export const getCachedProjectDetails = (projectId: string) => {
  return unstable_cache(
    async () => {
      return await ProjectModel.findOne({ uid: projectId })
        .select('-moderation.internalNotes')
        .lean();
    },
    [`project-details-${projectId}`],
    { revalidate: 60, tags: ['projects', `project-${projectId}`] }
  )();
};