import express from 'express';
import { body, validationResult } from 'express-validator';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// POST /api/orders - Create new order 
router.post('/',
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('cartItems').isArray({ min: 1 }).withMessage('Cart items must be a non-empty array'),
    body('cartItems.*.id').notEmpty().withMessage('Item ID is required'),
    body('cartItems.*.count').isInt({ min: 1 }).withMessage('Item count must be at least 1'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, phone, cartItems } = req.body;
        const db = getDB();

        // Validate that all lesson IDs exist
        const lessonIds = cartItems.map(item => item.id);
        const existingLessons = await db.collection('lessons').find({ id: { $in: lessonIds } }).toArray();

        if (existingLessons.length !== lessonIds.length) {
            return res.status(400).json({ error: 'Some lesson IDs do not exist' });
        }

        // Check availability for each lesson (but don't update yet)
        for (const item of cartItems) {
            const lesson = existingLessons.find(l => l.id === item.id);
            if (lesson.space < item.count) {
                return res.status(400).json({
                    error: `Not enough space for lesson ${item.id}. Available: ${lesson.space}, Requested: ${item.count}`
                });
            }
        }

        const order = {
            name,
            phone,
            cartItems,
            status: 'pending',
            total: calculateTotal(cartItems, existingLessons),
            createdAt: new Date()
        };

        const result = await db.collection('orders').insertOne(order);

        res.status(201).json({
            message: 'Order created successfully',
            orderId: result.insertedId,
            order: { ...order, _id: result.insertedId },
        });
    }
);

// Helper function to calculate total
const calculateTotal = (cartItems, lessons) => {
    return cartItems.reduce((total, item) => {
        const lesson = lessons.find(l => l.id === item.id);
        return total + (lesson ? lesson.price * item.count : 0);
    }, 0);
};

export default router;