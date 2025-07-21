# Stackverse Backend
A simple backend server that run CRUD operations on for a lesson store.

2024-25 CST3144 Full Stack Development

## Project Structure

```
stackverse-backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── config/
│   └── db.js        # Database connection
├── routes/
│   ├── lessons.js         # Lesson routes
│   └── orders.js          # Order routes
├── middleware/
│   ├── logger.js          # Custom logging middleware
│   └── notFound.js        # 404 handler
└── README.md
```

## Features

### Core API Endpoints
- `GET /api/lessons` - Get all lessons
- `POST /api/orders` - Create new order
- `PUT /api/lessons/update` - Update lesson attributes using either `update-fields`,`reduce-spaces` actions

### Middleware Stack
- **Validation**: Input validation with express-validator
- **Logging**: Custom logger

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`
4. Start the server:
   ```bash
   npm run dev  # Development with nodemon
   npm start    # Production
   ```

## Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/<db_name>
DB_NAME=<db_name>
```

## API Examples

### Get All Lessons
```bash
GET /api/lessons
```

### Create Order
```bash
POST /api/orders
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+1234567890",
  "cartItems": [
    {"id": "SN01", "count": 2},
    {"id": "SN02", "count": 1}
  ]
}
```

### Update Lessons
```bash
PUT /api/lessons/update
Content-Type: application/json

// Update lesson(s) attributes
{
    "action": "update-fields",
    "updates": [
        {
            "id": "SN01",
            "changes": {
                "location": "Berlin"
            }
        }
        {
            "id": "SN02",
            "changes": {
               ...
            }
        }
    ]
}

// Reduce lesson(s) space based on order

{
    "action":"reduce-spaces", 
    "orderId": "68772695b3eef2898eefcd08",
   "cartItems": [
         {
             "id": "SN01",
             "count": 2
        }
    ]
 }
```


## Logger Output

The custom logger outputs detailed information for each request:

```
[2024-01-15T10:30:45.123Z] POST /api/orders
  IP: 127.0.0.1
  User-Agent: Mozilla/5.0...
  Body: {
    "name": "John Doe",
    "phone": "+1234567890",
    "cartItems": [...]
  }
  ---
```

## Links
Github repo [link](https://github.com/UmesiQueen/stackverse-backend)

Deployment [link](https://stackverse-server.onrender.com/api/lessons)

Made with ❤️ Queen