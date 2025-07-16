import express from 'express';
import { body, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const router = express.Router();

// GET /api/lessons - Get all lessons
router.get('/', async (_, res) => {
    const db = getDB();
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
});

// PUT /api/lessons/update - Universal lesson update endpoint
router.put('/update',
    body('action').isIn(['reduce-spaces','update-fields']).withMessage('Action must be reduce-spaces or update-fields'),
    body('orderId').optional().notEmpty().withMessage('Order ID is required for space operations'),
    body('cartItems').optional().isArray({ min: 1 }).withMessage('Cart items must be a non-empty array'),
    body('cartItems.*.id').optional().notEmpty().withMessage('Lesson ID is required'),
    body('cartItems.*.count').optional().isInt({ min: 1 }).withMessage('Item count must be at least 1'),
    body('updates').optional().isArray({ min: 1 }).withMessage('Updates must be a non-empty array for field updates'),
    body('updates.*.id').optional().notEmpty().withMessage('Lesson ID is required for field updates'),
    body('updates.*.changes').optional().isObject().withMessage('Changes must be an object'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { action, orderId, cartItems, updates} = req.body;
        const db = getDB();

        // Start transaction for atomic updates
        const session = db.client.startSession();

        try {
            await session.withTransaction(async () => {
                let responseData = {};

                switch (action) {
                    case 'reduce-spaces':
                        // Validate required fields for space reduction
                        if (!orderId || !cartItems) {
                            throw new Error('Order ID and cart items are required for reducing spaces');
                        }

                        // Verify the order exists and is pending
                        const orderForReduction = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
                        if (!orderForReduction) {
                            throw new Error('Order not found');
                        }

                        if (orderForReduction.status !== 'pending') {
                            throw new Error('Order has already been processed');
                        }

                        // Check availability before reducing
                        for (const item of cartItems) {
                            const lesson = await db.collection('lessons').findOne({ id: item.id });
                            if (!lesson) {
                                throw new Error(`Lesson with ID ${item.id} not found`);
                            }
                            if (lesson.space < item.count) {
                                throw new Error(`Not enough space for lesson ${item.id}. Available: ${lesson.space}, Requested: ${item.count}`);
                            }
                        }

                        // Reduce lesson spaces
                        const reducePromises = cartItems.map(async (item) => {
                            return await db.collection('lessons').updateOne(
                                { id: item.id },
                                {
                                    $inc: { space: -item.count },
                                    $set: { updatedAt: new Date() }
                                }
                            );
                        });

                        await Promise.all(reducePromises);

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

                        responseData = {
                            message: 'Lesson spaces reduced successfully and order confirmed',
                            orderId: orderId,
                            updatedLessons: cartItems.map(item => ({
                                id: item.id,
                                reducedBy: item.count
                            })),
                            status: 'confirmed'
                        };
                        break;

                    case 'update-fields':
                        // Validate required fields for general updates
                        if (!updates) {
                            throw new Error('Updates array is required for field updates');
                        }

                        // Verify all lessons exist before updating
                        const lessonIds = updates.map(update => update.id);
                        const existingLessons = await db.collection('lessons').find({ id: { $in: lessonIds } }).toArray();

                        if (existingLessons.length !== lessonIds.length) {
                            const foundIds = existingLessons.map(lesson => lesson.id);
                            const missingIds = lessonIds.filter(id => !foundIds.includes(id));
                            throw new Error(`Lessons with IDs ${missingIds.join(', ')} not found`);
                        }

                        // Perform field updates
                        const updatePromises = updates.map(async (update) => {
                            const { id, changes } = update;

                            const updateData = {
                                ...changes,
                                updatedAt: new Date()
                            };

                            return await db.collection('lessons').updateOne(
                                { id: id },
                                { $set: updateData }
                            );
                        });

                        const results = await Promise.all(updatePromises);

                        // Check if all updates were successful
                        const failedUpdates = results.filter(result => result.modifiedCount === 0);
                        if (failedUpdates.length > 0) {
                            throw new Error('Some updates failed to apply');
                        }

                        responseData = {
                            message: 'Lesson fields updated successfully',
                            updatedCount: updates.length,
                            updatedLessons: updates.map(update => ({
                                id: update.id,
                                changes: update.changes
                            })),
                            status: 'success'
                        };
                        break;

                    default:
                        throw new Error('Invalid action specified');
                }

                res.json(responseData);
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        } finally {
            await session.endSession();
        }
    }
);

/* 
Example usage:

1. Reduce spaces when order is created:
PUT /api/lessons/update
{
    "action": "reduce-spaces",
    "orderId": "64a1b2c3d4e5f6789abcdef0",
    "cartItems": [
        { "id": "SN01", "count": 2 },
        { "id": "SN02", "count": 1 }
    ]
}

2. Update lesson fields:
PUT /api/lessons/update
{
    "action": "update-fields",
    "updates": [
        {
            "id": "SN01",
            "changes": {
                "price": 35.99,
                "description": "Updated description"
            }
        }
    ]
}
*/

export default router;