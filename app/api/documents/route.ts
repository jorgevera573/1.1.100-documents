import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { deleteFromS3, generateS3Key, uploadToS3 } from '@/lib/s3';
import type { Document } from '@/lib/types';

function badRequest(error: string) {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';
    const limitText = searchParams.get('limit') ?? '50';
    const skipText = searchParams.get('skip') ?? '0';

    if (!/^\d+$/.test(limitText) || !/^\d+$/.test(skipText)) {
      return badRequest('limit and skip must be non-negative integers');
    }

    const limit = Number(limitText);
    const skip = Number(skipText);

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return badRequest('limit must be between 1 and 100');
    }

    if (!Number.isSafeInteger(skip) || skip < 0) {
      return badRequest('skip must be a non-negative safe integer');
    }

    // Interpretar la búsqueda como texto literal.
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = query
      ? {
          $or: [
            { nombre: { $regex: escapedQuery, $options: 'i' } },
            { descripcion: { $regex: escapedQuery, $options: 'i' } },
          ],
        }
      : {};

    const db = await getDatabase();
    const collection = db.collection<Omit<Document, '_id'>>('documents');

    const documents = await collection
      .find(filter)
      .sort({ fecha: -1, _id: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await collection.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: documents,
      total,
    });
  } catch (error) {
    console.error('GET documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return badRequest('Invalid form data');
    }

    const archivo = formData.get('archivo');
    const nombre = formData.get('nombre');
    const descripcion = formData.get('descripcion');

    if (!(archivo instanceof File)) {
      return badRequest('archivo must be a file');
    }

    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      return badRequest('nombre must be a non-empty string');
    }

    if (descripcion !== null && typeof descripcion !== 'string') {
      return badRequest('descripcion must be a string');
    }

    if (archivo.size === 0) {
      return badRequest('File is empty');
    }

    if (archivo.size > 100 * 1024 * 1024) {
      return badRequest('File size exceeds 100MB limit');
    }

    // Comprobar MongoDB antes de subir el archivo.
    const db = await getDatabase();
    const collection = db.collection('documents');

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const s3Key = generateS3Key(archivo.name);
    const contentType = archivo.type || 'application/octet-stream';

    await uploadToS3(s3Key, buffer, contentType);

    const document = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() ?? '',
      s3Key,
      tamaño: archivo.size,
      contentType,
      fecha: new Date(),
    };

    const result = await collection.insertOne(document).catch(
      async (databaseError: unknown) => {
        try {
          await deleteFromS3(s3Key);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded S3 object:', {
            s3Key,
            cleanupError,
          });
        }

        throw databaseError;
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: { ...document, _id: result.insertedId.toString() },
        message: 'Document uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}