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

// PUT /api/orders/update-availability - Update lesson availability after successful order
router.put('/update-availability',
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('cartItems').isArray({ min: 1 }).withMessage('Cart items must be a non-empty array'),
    body('cartItems.*.id').notEmpty().withMessage('Item ID is required'),
    body('cartItems.*.count').isInt({ min: 1 }).withMessage('Item count must be at least 1'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderId, cartItems } = req.body;
        const db = getDB();

        // Verify the order exists and is pending
        const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Order has already been processed' });
        }

        // Start transaction for atomic updates
        const session = db.client.startSession();

        try {
            await session.withTransaction(async () => {
                // Double-check availability before updating
                for (const item of cartItems) {
                    const lesson = await db.collection('lessons').findOne({ id: item.id });

                    if (!lesson) {
                        throw new Error(`Lesson with ID ${item.id} not found`);
                    }

                    if (lesson.space < item.count) {
                        throw new Error(`Not enough space for lesson ${item.id}. Available: ${lesson.space}, Requested: ${item.count}`);
                    }
                }

                // Update lesson availability
                const updatePromises = cartItems.map(async (item) => {
                    return await db.collection('lessons').updateOne(
                        { id: item.id },
                        {
                            $inc: { space: -item.count },
                            $set: { updatedAt: new Date() }
                        }
                    );
                });

                await Promise.all(updatePromises);

                // Update order status to confirmed
                await db.collection('orders').updateOne(
                    { _id: new ObjectId(orderId) },
                    {
                        $set: {
                            status: 'confirmed',
                            updatedAt: new Date()
                        }
                    }
                );
            });

            res.json({
                message: 'Lesson availability updated successfully and order confirmed',
                orderId: orderId,
                updatedLessons: cartItems.map(item => ({
                    id: item.id,
                    reducedBy: item.count
                })),
                status: 'confirmed'
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        } finally {
            await session.endSession();
        }
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