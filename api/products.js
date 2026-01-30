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
    // 1. GET - Obtener todos los productos
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    }

    // 2. POST - Crear producto (subir imagen + guardar en DB)
    if (req.method === 'POST') {
      const { name, category, price, description, badge, imageBase64, imageName } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Falta la imagen' });
      }

      // Subir a Vercel Blob
      // Convertimos base64 a Buffer (usando el global de Node.js)
      const bufferData = Buffer.from(imageBase64.split(',')[1], 'base64');
      const blob = await put(`products/${Date.now()}-${imageName}`, bufferData, {
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
    }

    // 3. DELETE - Eliminar producto
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error en API:', error);
    return res.status(500).json({ error: error.message });
  }
}
