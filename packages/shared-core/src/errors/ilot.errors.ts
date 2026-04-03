// packages/shared-core/src/errors/ilot.errors.ts
export class IlotError extends Error {
  constructor(public message: string, public code: string, public status: number = 500) {
    super(message);
    this.name = 'IlotError';
  }
}

export class DatabaseSyncError extends IlotError {
  constructor(entity: string, id: string, originalError: any) {
    super(
      `Désynchronisation critique pour ${entity} [${id}] : ${originalError.message}`,
      'SYNC_FAILURE',
      500
    );
  }
}