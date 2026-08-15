import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { generateS3Key, uploadToS3 } from '@/lib/s3';
import { Document } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const db = await getDatabase();
    const collection = db.collection<Omit<Document, '_id'>>('documents');

    let filter = {};
    if (query) {
      filter = {
        $or: [
          { nombre: { $regex: query, $options: 'i' } },
          { descripcion: { $regex: query, $options: 'i' } },
        ],
      };
    }

    const documents = await collection
      .find(filter)
      .sort({ fecha: -1 })
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
    const formData = await request.formData();
    const archivo = formData.get('archivo') as File;
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string;

    if (!archivo || !nombre) {
      return NextResponse.json(
        { success: false, error: 'archivo and nombre are required' },
        { status: 400 }
      );
    }

    if (archivo.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      );
    }

    if (archivo.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const s3Key = generateS3Key(archivo.name);

    await uploadToS3(s3Key, buffer, archivo.type);

    const db = await getDatabase();
    const collection = db.collection('documents');

    const document = {
      nombre,
      descripcion: descripcion || '',
      s3Key,
      tamaño: archivo.size,
      contentType: archivo.type,
      fecha: new Date(),
    };

    const result = await collection.insertOne(document);

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
