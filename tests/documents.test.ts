import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  uploadToS3: vi.fn(),
  deleteFromS3: vi.fn(),
  generateS3Key: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  insertOne: vi.fn(),
  deleteOne: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDatabase: mocks.getDatabase,
}));

vi.mock('@/lib/s3', () => ({
  uploadToS3: mocks.uploadToS3,
  deleteFromS3: mocks.deleteFromS3,
  generateS3Key: mocks.generateS3Key,
}));

import { GET as list, POST } from '@/app/api/documents/route';
import { PUT, DELETE } from '@/app/api/documents/[id]/route';

const id = '507f1f77bcf86cd799439011';
const context = () => ({ params: Promise.resolve({ id }) });

function updateRequest(body: string) {
  return new NextRequest(`http://localhost/api/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function uploadRequest(nombre = 'Documento') {
  const form = new FormData();
  form.set('nombre', nombre);
  form.set('archivo', new File(['contenido'], 'prueba.txt', {
    type: 'text/plain',
  }));

  return new NextRequest('http://localhost/api/documents', {
    method: 'POST',
    body: form,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});

  mocks.getDatabase.mockResolvedValue({
    collection: () => ({
      findOne: mocks.findOne,
      findOneAndUpdate: mocks.findOneAndUpdate,
      insertOne: mocks.insertOne,
      deleteOne: mocks.deleteOne,
      find: mocks.find,
      countDocuments: mocks.countDocuments,
    }),
  });

  mocks.generateS3Key.mockReturnValue('documents/prueba.txt');
  mocks.uploadToS3.mockResolvedValue(undefined);
  mocks.deleteFromS3.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([
  'limit=0',
  'limit=101',
  'limit=abc',
  'skip=-1',
  'skip=1.5',
])('rechaza paginación inválida: %s', async (query) => {
  const response = await list(
    new NextRequest(`http://localhost/api/documents?${query}`)
  );

  expect(response.status).toBe(400);
  expect(mocks.getDatabase).not.toHaveBeenCalled();
});

test('busca caracteres especiales como texto literal', async () => {
  const cursor = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  };
  mocks.find.mockReturnValue(cursor);
  mocks.countDocuments.mockResolvedValue(0);

  const response = await list(
    new NextRequest('http://localhost/api/documents?q=a%2Eb%5B')
  );

  expect(response.status).toBe(200);
  expect(mocks.find).toHaveBeenCalledWith({
    $or: [
      { nombre: { $regex: 'a\\.b\\[', $options: 'i' } },
      { descripcion: { $regex: 'a\\.b\\[', $options: 'i' } },
    ],
  });
});

test.each([
  '{',
  'null',
  '[]',
  '{}',
  '{"nombre":"   "}',
  '{"nombre":123}',
  '{"descripcion":false}',
])('rechaza edición inválida: %s', async (body) => {
  const response = await PUT(updateRequest(body), context());

  expect(response.status).toBe(400);
  expect(mocks.getDatabase).not.toHaveBeenCalled();
});

test('permite vaciar la descripción y recorta el nombre', async () => {
  mocks.findOneAndUpdate.mockResolvedValue({
    _id: id,
    nombre: 'Informe',
    descripcion: '',
  });

  const response = await PUT(
    updateRequest(JSON.stringify({
      nombre: ' Informe ',
      descripcion: '',
    })),
    context()
  );

  expect(response.status).toBe(200);
  expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
    expect.anything(),
    { $set: { nombre: 'Informe', descripcion: '' } },
    { returnDocument: 'after' }
  );
});

test('conserva los metadatos cuando falla el borrado en S3', async () => {
  mocks.findOne.mockResolvedValue({ s3Key: 'documents/prueba.txt' });
  mocks.deleteFromS3.mockRejectedValue(new Error('S3 unavailable'));

  const response = await DELETE(
    new NextRequest(`http://localhost/api/documents/${id}`, {
      method: 'DELETE',
    }),
    context()
  );

  expect(response.status).toBe(500);
  expect(mocks.deleteOne).not.toHaveBeenCalled();
});

test('rechaza una subida con nombre vacío', async () => {
  const response = await POST(uploadRequest('   '));

  expect(response.status).toBe(400);
  expect(mocks.uploadToS3).not.toHaveBeenCalled();
});

test('no sube a S3 cuando falla la conexión a MongoDB', async () => {
  mocks.getDatabase.mockRejectedValue(new Error('MongoDB unavailable'));

  const response = await POST(uploadRequest());

  expect(response.status).toBe(500);
  expect(mocks.uploadToS3).not.toHaveBeenCalled();
});

test('retira el archivo de S3 cuando falla la inserción', async () => {
  mocks.insertOne.mockRejectedValue(new Error('Insert failed'));

  const response = await POST(uploadRequest());

  expect(response.status).toBe(500);
  expect(mocks.uploadToS3).toHaveBeenCalledOnce();
  expect(mocks.deleteFromS3).toHaveBeenCalledWith('documents/prueba.txt');
});

test('devuelve 201 cuando la subida y la inserción funcionan', async () => {
  mocks.insertOne.mockResolvedValue({ insertedId: id });

  const response = await POST(uploadRequest());
  const body = await response.json();

  expect(response.status).toBe(201);
  expect(body.data._id).toBe(id);
  expect(body.data.nombre).toBe('Documento');
  expect(mocks.deleteFromS3).not.toHaveBeenCalled();
});