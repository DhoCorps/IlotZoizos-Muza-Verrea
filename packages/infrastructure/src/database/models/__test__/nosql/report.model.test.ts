import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { ReportModel } from '../../nosql/report.model'; // Ajuste le chemin relatif selon l'emplacement de ton test
import { connectToDatabase } from '../../../mongoose'; // Ajuste selon ton chemin

describe('Report Model Test', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should create & save a report with default mediation status', async () => {
    const reporterId = new mongoose.Types.ObjectId();
    const reportedUserId = new mongoose.Types.ObjectId();

    const reportData = {
      reporter: reporterId,
      reportedUser: reportedUserId,
      reason: 'Tension constatée lors d’un échange sur un module.'
    };

    const report = new ReportModel(reportData);
    const savedReport = await report.save();

    expect(savedReport._id).toBeDefined();
    expect(savedReport.status).toBe('mediation');
    expect(savedReport.mediationLog).toHaveLength(0);
    expect(savedReport.createdAt).toBeDefined();
  });
});