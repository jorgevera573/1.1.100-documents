import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { deleteFromS3 } from '@/lib/s3';

function isValidObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('documents');

    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('GET document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'Body must be a JSON object' },
        { status: 400 }
      );
    }

    const { nombre, descripcion } = body as Record<string, unknown>;

    if (nombre === undefined && descripcion === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    const updateData: { nombre?: string; descripcion?: string } = {};

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'nombre must be a non-empty string' },
          { status: 400 }
        );
      }

      updateData.nombre = nombre.trim();
    }

    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string') {
        return NextResponse.json(
          { success: false, error: 'descripcion must be a string' },
          { status: 400 }
        );
      }

      updateData.descripcion = descripcion.trim();
    }

    const db = await getDatabase();
    const collection = db.collection('documents');

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('PUT document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('documents');

    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    await deleteFromS3(document.s3Key);
    await collection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('DELETE document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
