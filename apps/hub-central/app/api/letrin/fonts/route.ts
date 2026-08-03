import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { FontProject } from '@ilot/infrastructure';

export async function GET() {
  try {
    await connectToDatabase();
    const projects = await FontProject.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const newProject = await FontProject.create(body);
    return NextResponse.json({ success: true, data: newProject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }
}