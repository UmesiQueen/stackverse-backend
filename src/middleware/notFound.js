export const notFound = (req, res) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    });
};