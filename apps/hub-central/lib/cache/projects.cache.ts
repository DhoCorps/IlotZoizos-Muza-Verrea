// Fichier : lib/cache/projects.cache.ts
import { unstable_cache } from 'next/cache';
import { ProjectModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Récupération des projets optimisée (La Clairière)
// -------------------------------------------------------------------------
export const getCachedProjects = (userUid?: string, requestedOwnerUid?: string, myProjectUids: string[] = []) => {
  return unstable_cache(
    async () => {
      let queryFilter: any = { 
        $or: [
          { visibility: { $in: ['PUBLIC', 'OPEN_SOURCE'] } }, 
          { uid: { $in: myProjectUids } }
        ]
      };
      if (requestedOwnerUid) {
        queryFilter = {
          $and: [
            { ownerUid: requestedOwnerUid },
            { $or: queryFilter.$or }
          ]
        };
      }
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