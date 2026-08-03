import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { FontProject } from '@ilot/infrastructure';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    await FontProject.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: "Projet supprimé." });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur lors de la suppression" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const updated = await FontProject.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}