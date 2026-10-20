import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage and file validation
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    const err = new Error('Only image/jpeg, image/png, and image/webp images are allowed');
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter
});

const postBodySchema = z.object({
  body: z
    .string({ required_error: 'Body is required' })
    .trim()
    .min(1, 'Post body cannot be empty')
    .max(1000, 'Post body cannot exceed 1000 characters')
});

const commentBodySchema = z.object({
  body: z
    .string({ required_error: 'Comment body is required' })
    .trim()
    .min(1, 'Comment body cannot be empty')
    .max(500, 'Comment body cannot exceed 500 characters')
});

// All post routes require authentication
router.use(requireAuth);

// GET /api/posts - Latest 50 posts with counts, liked status, and image_url
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        p.id,
        p.user_id,
        u.username,
        p.body,
        p.image_path,
        p.created_at,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
        EXISTS(SELECT 1 FROM likes my_l WHERE my_l.post_id = p.id AND my_l.user_id = ?) AS liked_by_me
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 50;
    `;

    const rows = await query(sql, [req.user.id]);

    const posts = rows.map((r) => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      username: r.username,
      body: r.body,
      image_url: r.image_path ? `/uploads/${r.image_path}` : null,
      likes: Number(r.likes),
      comments: Number(r.comments),
      liked_by_me: Boolean(r.liked_by_me),
      created_at: r.created_at
    }));

    return res.status(200).json({ posts });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts - Create post with multipart/form-data
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const validationResult = postBodySchema.safeParse(req.body);

    if (!validationResult.success) {
      // Clean up uploaded file if body validation fails
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      return next(validationResult.error);
    }

    const { body } = validationResult.data;
    const imagePath = req.file ? req.file.filename : null;

    const result = await query(
      'INSERT INTO posts (user_id, body, image_path) VALUES (?, ?, ?)',
      [req.user.id, body, imagePath]
    );

    const newPost = {
      id: result.insertId,
      user_id: req.user.id,
      username: req.user.username,
      body,
      image_url: imagePath ? `/uploads/${imagePath}` : null,
      likes: 0,
      comments: 0,
      liked_by_me: false,
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ post: newPost });
  } catch (err) {
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
});

// POST /api/posts/:id/like - Toggle like
router.post('/:id/like', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postRows = await query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likeRows = await query(
      'SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, req.user.id]
    );

    if (likeRows.length > 0) {
      await query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
      return res.status(200).json({ liked: false });
    } else {
      await query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
      return res.status(200).json({ liked: true });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id/comments - List post comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postRows = await query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await query(
      `SELECT c.id, c.post_id, c.user_id, u.username, c.body, c.created_at
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC, c.id ASC`,
      [postId]
    );

    return res.status(200).json({ comments });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:id/comments - Add comment to post
router.post('/:id/comments', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const data = commentBodySchema.parse(req.body);

    const postRows = await query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = await query(
      'INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)',
      [postId, req.user.id, data.body]
    );

    const newComment = {
      id: result.insertId,
      post_id: postId,
      user_id: req.user.id,
      username: req.user.username,
      body: data.body,
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ comment: newComment });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id - Delete own post
router.delete('/:id', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const rows = await query('SELECT id, user_id, image_path FROM posts WHERE id = ?', [postId]);
    if (rows.length === 0 || Number(rows[0].user_id) !== Number(req.user.id)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = rows[0];

    await query('DELETE FROM posts WHERE id = ?', [postId]);

    // Clean up file if present
    if (post.image_path) {
      const filePath = path.join(uploadDir, post.image_path);
      await fs.promises.unlink(filePath).catch(() => {});
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
