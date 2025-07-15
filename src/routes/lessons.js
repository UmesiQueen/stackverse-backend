import express from 'express';
import { getDB } from '../config/db.js';

const router = express.Router();

// GET /api/lessons - Get all lessons
router.get('/', async (_, res) => {
    const db = getDB();
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
});


export default router;