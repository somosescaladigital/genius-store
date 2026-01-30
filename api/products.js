import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PRUEBA DE CONEXIÓN: ?ping=1
  if (req.query.ping) {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'API is working',
      env: {
        hasPostgres: !!process.env.POSTGRES_URL,
        hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
      }
    });
  }

  try {
    // Verificar variables antes de llamar a las librerías
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({ error: 'POSTGRES_URL no está configurada en Vercel' });
    }

    // 1. GET - Obtener todos los productos
    if (req.method === 'GET') {
      try {
        // Asegurar que la tabla existe (solo lo intentamos aquí)
        await sql`CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price TEXT NOT NULL,
          description TEXT,
          badge TEXT,
          image TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

        const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
        return res.status(200).json(rows);
      } catch (dbError) {
        console.error('Error DB GET:', dbError);
        return res.status(500).json({ error: 'Error de base de datos (GET): ' + dbError.message });
      }
    }

    // 2. POST - Crear producto
    if (req.method === 'POST') {
      const { name, category, price, description, badge, imageBase64, imageName } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Falta la imagen' });
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN no está configurada' });
      }

      try {
        const base64Data = imageBase64.split(',')[1];
        if (!base64Data) throw new Error('Base64 inválido');
        
        const bufferData = Buffer.from(base64Data, 'base64');
        const blob = await put(`products/${Date.now()}-${imageName || 'img.png'}`, bufferData, {
          access: 'public',
          contentType: 'image/png' 
        });

        const result = await sql`
          INSERT INTO products (name, category, price, description, badge, image)
          VALUES (${name}, ${category}, ${price}, ${description}, ${badge}, ${blob.url})
          RETURNING *
        `;

        return res.status(201).json(result.rows[0]);
      } catch (postError) {
        console.error('Error DB/Blob POST:', postError);
        return res.status(500).json({ error: 'Error al subir producto: ' + postError.message });
      }
    }

    // 3. DELETE - Eliminar
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      
      try {
        await sql`DELETE FROM products WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      } catch (delError) {
        console.error('Error DB DELETE:', delError);
        return res.status(500).json({ error: 'Error al eliminar: ' + delError.message });
      }
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    return res.status(500).json({ 
      error: 'Error crítico en el servidor',
      message: error.message
    });
  }
}
