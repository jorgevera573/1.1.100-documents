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
