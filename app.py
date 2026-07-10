from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

@app.route("/stock/<symbol>")
def get_stock_data(symbol):
    API_KEY = os.getenv("TWELVE_DATA_KEY")

    if not API_KEY:
        return jsonify({"error": "API key not found"}), 500

    url = (
        f"https://api.twelvedata.com/time_series"
        f"?symbol={symbol}"
        f"&interval=1day"
        f"&outputsize=90"
        f"&apikey={API_KEY}"
    )

    response = requests.get(url)
    data = response.json()

    values = data.get("values", [])

    prices = {}

    for entry in values:
        prices[entry["datetime"]] = float(entry["close"])

    return jsonify(prices)

port = int(os.environ.get("PORT", 5000))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=port, debug=False)