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

    const body = await request.json();
    const { nombre, descripcion } = body;

    if (!nombre && descripcion === undefined) {
      return NextResponse.json(
        { success: false, error: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;

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

    try {
      await deleteFromS3(document.s3Key);
    } catch (s3Error) {
      console.error('S3 deletion warning:', s3Error);
    }

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
