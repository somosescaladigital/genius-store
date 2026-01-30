import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // Configuración de CORS simple para permitir peticiones desde el mismo dominio
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Auto-creación de la tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price TEXT NOT NULL,
        description TEXT,
        badge TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 1. GET - Obtener todos los productos
    if (req.method === 'GET') {
      try {
        const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
        return res.status(200).json(rows);
      } catch (dbError) {
        console.error('Error al obtener productos:', dbError);
        return res.status(500).json({ error: 'Error al conectar con la base de datos: ' + dbError.message });
      }
    }

    // 2. POST - Crear producto (subir imagen + guardar en DB)
    if (req.method === 'POST') {
      const { name, category, price, description, badge, imageBase64, imageName } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Falta la imagen' });
      }

      // Validar variables de entorno obligatorias
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'Configuración faltante: BLOB_READ_WRITE_TOKEN no definida en Vercel' });
      }

      try {
        // Subir a Vercel Blob
        // Convertimos base64 a Buffer (usando el global de Node.js)
        const base64Data = imageBase64.split(',')[1];
        if (!base64Data) {
          throw new Error('Formato de imagen Base64 inválido');
        }
        
        const bufferData = Buffer.from(base64Data, 'base64');
        const blob = await put(`products/${Date.now()}-${imageName || 'image.png'}`, bufferData, {
          access: 'public',
          contentType: 'image/png' 
        });

        // Guardar en Postgres
        const result = await sql`
          INSERT INTO products (name, category, price, description, badge, image)
          VALUES (${name}, ${category}, ${price}, ${description}, ${badge}, ${blob.url})
          RETURNING *
        `;

        return res.status(201).json(result.rows[0]);
      } catch (uploadError) {
        console.error('Error en carga/DB:', uploadError);
        return res.status(500).json({ error: 'Error al procesar la carga: ' + uploadError.message });
      }
    }

    // 3. DELETE - Eliminar producto
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID de producto requerido' });
      
      try {
        await sql`DELETE FROM products WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      } catch (deleteError) {
        console.error('Error al eliminar:', deleteError);
        return res.status(500).json({ error: 'Error al eliminar el producto: ' + deleteError.message });
      }
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error general en API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
