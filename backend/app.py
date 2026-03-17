import os
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import plaid
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app, support_credentials=True)

# Plaid configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "Sandbox") # default Sandbox

# Initialize Plaid client
configuration = plaid.Configuration(
    host=getattr(plaid.Environment, PLAID_ENV),
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client) # use this to call endpoints

# Store access tokens (in production, use a database)
access_tokens = {}

# @app.before_request 
# def before_request(): 
#     headers = { 'Access-Control-Allow-Origin': '*', 
#                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 
#                'Access-Control-Allow-Headers': 'Content-Type' } 
#     if request.method == 'OPTIONS': 
#         return jsonify(headers), 200
    
@app.route('/api/test-plaid', methods=['GET'])
def test_plaid():
    try:
        # Simplest possible Plaid API call
        response = client.institutions_get_by_id(
            InstitutionsGetByIdRequest(
                institution_id='ins_3',  # Chase — always exists in sandbox
                country_codes=[CountryCode('US')]
            )
        )
        return jsonify({
            "status": "✅ Plaid connection working",
            "institution": response.institution.name
        })
    except plaid.ApiException as e:
        import json
        return jsonify({
            "status": "❌ Plaid connection failed",
            "error": json.loads(e.body)
        }), 400

@app.route("/api/link-token", methods=["POST"])
def create_link_token():
    """Create a Plaid Link token for the frontend"""
    try:
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(
                client_user_id="user-id"
            ),
            client_name="Lucy Finance App",
            products=[Products("transactions")],
            country_codes=["US"],
            language="en",
        )
        print(request)
        response = client.link_token_create(request)
        return jsonify({"link_token": response['link_token']}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/exchange-token", methods=["POST"])
def exchange_token():
    """Exchange public token for access token"""
    try:
        data = request.get_json()
        public_token = data.get("public_token")
        user_id = data.get("user_id", "user-id")

        request_data = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = client.item_public_token_exchange(request_data)

        # Store access token
        access_tokens[user_id] = response.access_token

        return jsonify(
            {
                "success": True,
                "access_token": response.access_token,
                "item_id": response.item_id,
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/transactions", methods=["POST"])
def get_transactions():
    """Fetch transactions from Plaid"""
    try:
        data = request.get_json()
        access_token = data.get("access_token")
        user_id = data.get("user_id", "user-id")

        # Use provided token or get from storage
        if not access_token and user_id in access_tokens:
            access_token = access_tokens[user_id]

        if not access_token:
            return jsonify({"error": "No access token provided"}), 400

        # Get last 30 days of transactions
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)

        request_data = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
        )
        response = client.transactions_get(request_data)

        # Get only the first 3 transactions
        transactions = response.transactions[:3]

        # Format transactions for response
        formatted_transactions = [
            {
                "id": txn.transaction_id,
                "name": txn.name,
                "amount": txn.amount,
                "date": str(txn.date),
                "merchant_name": txn.merchant_name,
                "account_id": txn.account_id,
            }
            for txn in transactions
        ]

        return jsonify(
            {
                "success": True,
                "transactions": formatted_transactions,
                "total_transactions": len(response.transactions),
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
