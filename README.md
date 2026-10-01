# 📄 Gestor de Documentos — Next.js + MongoDB + S3

## 🎯 Objetivo del proyecto

Aprender a construir un **gestor documental** completo: subir ficheros a un almacenamiento de objetos compatible con S3, guardar sus metadatos en MongoDB y ofrecer búsqueda, descarga y borrado desde una interfaz web.

Con este proyecto el alumno practica:

- La separación entre **almacenamiento binario** (el fichero va a S3) y **metadatos** (la información del documento va a MongoDB).
- El uso del **SDK de AWS S3** (`@aws-sdk/client-s3`) y de URLs prefirmadas (`@aws-sdk/s3-request-presigner`).
- La creación de **API Routes** en Next.js (App Router) como backend.
- Componentes React cliente que consumen esa API.
- Requisito : Node.js 24.x

## 🏗️ Arquitectura

```
┌─────────────────┐      fetch       ┌──────────────────────┐
│  Componentes    │ ───────────────► │  API Routes Next.js  │
│  React (client) │                  │  /api/documents/...  │
└─────────────────┘                  └──────────┬───────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                                   ▼
                     ┌─────────────────┐               ┌──────────────────┐
                     │     MongoDB     │               │   S3 (RustFS/    │
                     │   (metadatos)   │               │   MinIO/AWS)     │
                     └─────────────────┘               │   (ficheros)     │
                                                       └──────────────────┘
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | API Routes de Next.js |
| Base de datos | MongoDB (driver nativo, sin ORM) |
| Storage | S3 compatible vía `@aws-sdk/client-s3` |

### Estructura de carpetas

```
app/
  page.tsx                             # Página principal
  api/documents/route.ts               # GET (listar/buscar) + POST (subir)
  api/documents/[id]/route.ts          # GET (detalle) + DELETE (borrar)
  api/documents/[id]/download/route.ts # GET (descargar el fichero)
components/
  UploadForm.tsx                       # Formulario de subida
  MetadataEditor.tsx                   # Edición de metadatos
  SearchBar.tsx                        # Búsqueda
  DocumentCard.tsx / DocumentList.tsx  # Listado de documentos
lib/
  mongodb.ts                           # Conexión singleton a MongoDB
  s3.ts                                # Cliente S3 y helpers
  types.ts                             # Tipos TypeScript compartidos
```

## ⚙️ Funcionalidades

- **Subir documentos** con metadatos asociados (nombre, descripción, etc.).
- **Listar y buscar** documentos por sus metadatos.
- **Editar metadatos** de un documento ya subido.
- **Descargar** el fichero original desde S3.
- **Eliminar** documentos (fichero + metadatos).

## 💡 Solución

La clave del diseño es que **el fichero y sus metadatos viven en sitios distintos**:

1. Al subir, la API Route recibe el fichero, lo envía a S3 con una clave única y guarda en MongoDB un documento con `{ nombre, descripción, s3Key, tamaño, fecha }`.
2. La búsqueda y el listado solo tocan MongoDB (rápido y barato); S3 únicamente se consulta al descargar.
3. La descarga se hace a través de la API (`/api/documents/[id]/download`), que recupera el objeto de S3 — así las credenciales nunca llegan al navegador.
4. La conexión a MongoDB es un **singleton** (`lib/mongodb.ts`) para no abrir una conexión nueva en cada petición.

## 🚀 Cómo ejecutar

1. Arranca MongoDB en local y un servidor S3 compatible (por ejemplo RustFS o MinIO en Docker).
2. Crea `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=documents
S3_ENDPOINT=http://localhost:9001
S3_ACCESS_KEY_ID=rustfsadmin
S3_SECRET_ACCESS_KEY=rustfsadmin
S3_BUCKET=documents
S3_REGION=us-east-1
```

3. Instala dependencias y arranca:

```bash
npm ci
npm run dev
```

4. Abre [http://localhost:9000](http://localhost:3000).

## Verificación de calidad

```bash
npm run lint
npm test
npm run build
npm audit
```

Las 19 pruebas automatizadas verifican las rutas con MongoDB y S3
simulados, incluyendo validaciones y recuperación ante fallos.
La comprobación funcional con servicios reales incluye subida,
búsqueda, edición, descarga y borrado.

El pipeline de GitLab ejecuta ESLint, pruebas, compilación y auditoría
de dependencias dentro de un contenedor temporal de Node.js.
Requiere Docker Desktop y el runner local activos.
La compilación descarga las fuentes de Google Fonts.

## Almacenamiento local y diagnóstico

El servicio S3 debe estar activo y el bucket configurado en `S3_BUCKET`
debe existir. Las credenciales se guardan en `.env.local`.

En el entorno local utilizado para esta práctica, el servicio S3
corresponde al contenedor existente `videovault-rustfs`, con la API
publicada en el puerto 9000:

```powershell
docker start videovault-rustfs
```

- `ECONNREFUSED`: comprobar que el servicio está activo y que
  `S3_ENDPOINT` apunta al puerto de la API.
- `NoSuchBucket`: crear el bucket configurado antes de subir documentos.
- `EADDRINUSE`: el puerto de Next.js ya está ocupado por otro proceso.

Para ejecutar la versión compilada en un puerto alternativo:

```bash
npm start -- --port 3003
```

MongoDB y S3 no comparten una transacción atómica. Si falla la inserción
de metadatos, la aplicación intenta retirar el archivo subido. Si falla
el borrado en S3, conserva los metadatos para permitir un reintento.
