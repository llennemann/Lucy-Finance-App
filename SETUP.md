# Lucy Finance App - Setup Guide

## Project Structure

```
/
├── backend/           # Flask API
│   ├── app.py        # Main Flask application
│   └── requirements.txt
├── frontend/         # Vanilla JS frontend
│   ├── index.html    # Main UI
│   └── app.js        # Frontend logic
├── .env              # Environment variables
└── .gitignore        # Git ignore rules
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js (optional, for serving frontend)
- Plaid Developer Account (for sandbox credentials)

### Backend Setup

1. **Create a virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Update .env file:**
   - Get your Plaid credentials from [Plaid Dashboard](https://dashboard.plaid.com)
   - Update `PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env`
   - Keep `PLAID_ENV=sandbox` for testing

4. **Run the backend:**
   ```bash
   python app.py
   ```
   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Open frontend in browser:**
   - Open `frontend/index.html` in a web browser
   - Or use a simple HTTP server:
     ```bash
     cd frontend
     python -m http.server 8000
     ```
   - Then visit `http://localhost:8000`

## Usage

1. **Connect Bank Account:**
   - Click "Connect Bank Account" button
   - The Plaid Link modal will open
   - In sandbox mode, use test credentials:
     - Username: `user_good`
     - Password: `pass_good`

2. **Fetch Transactions:**
   - After connecting, click "Fetch Transactions"
   - The app will display the 3 most recent transactions

3. **View Transactions:**
   - Transactions show merchant name, date, and amount
   - Expenses are shown in red, income in green

## API Endpoints

### POST `/api/link-token`
Creates a Plaid Link token for the frontend.

**Response:**
```json
{
  "link_token": "link-sandbox-abc123..."
}
```

### POST `/api/exchange-token`
Exchanges a public token for an access token.

**Request:**
```json
{
  "public_token": "public-sandbox-abc123...",
  "user_id": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "access-sandbox-abc123...",
  "item_id": "item-abc123..."
}
```

### POST `/api/transactions`
Fetches transactions from Plaid.

**Request:**
```json
{
  "access_token": "access-sandbox-abc123...",
  "user_id": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn-abc123",
      "name": "Amazon",
      "amount": 49.99,
      "date": "2024-03-17",
      "merchant_name": "Amazon",
      "account_id": "acc-abc123"
    }
  ],
  "total_transactions": 15
}
```

## Using with Streamlit

The frontend is vanilla JavaScript and can be embedded in Streamlit using:

```python
import streamlit as st
from streamlit.components.v1 import components

with open("frontend/index.html", "r") as f:
    html_code = f.read()

components.html(html_code, height=800)
```

## Troubleshooting

### CORS Errors
- Make sure Flask backend is running on port 5000
- Frontend must communicate from `http://localhost:8000` or similar

### Plaid Link Not Opening
- Check browser console for errors
- Verify `PLAID_CLIENT_ID` is correct
- Ensure `PLAID_ENV=sandbox`

### No Transactions Showing
- Some test credentials may not have transactions
- Try different sandbox credentials
- Check Flask logs for detailed error messages

## Next Steps

1. **Database Integration:** Store access tokens and transactions in a database (PostgreSQL, SQLite, etc.)
2. **Authentication:** Implement user authentication
3. **Production:** Switch `PLAID_ENV` to `production` and use live credentials
4. **Streamlit Integration:** Embed frontend in Streamlit dashboard
5. **Additional Features:** Add categories, charts, budget tracking, etc.

## Documentation

- [Plaid API Docs](https://plaid.com/docs/)
- [Plaid Link Documentation](https://plaid.com/docs/link/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Streamlit Documentation](https://docs.streamlit.io/)
