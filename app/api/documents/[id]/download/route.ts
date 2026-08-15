import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { downloadFromS3 } from '@/lib/s3';

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

    const fileBuffer = await downloadFromS3(document.s3Key);

    const response = new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': document.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.nombre)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
