export interface Document {
  _id?: string;
  nombre: string;
  descripcion: string;
  s3Key: string;
  tamaño: number;
  fecha: Date;
  contentType: string;
}

export interface DocumentResponse {
  success: boolean;
  data?: Document | Document[] | string;
  error?: string;
  message?: string;
}

export interface SearchParams {
  q?: string;
  limit?: number;
  skip?: number;
}
// Los datos enviados por la API contienen fechas e identificadores como texto.
export type DocumentDTO = Omit<Document, '_id' | 'fecha'> & {
  _id: string;
  fecha: string;
};