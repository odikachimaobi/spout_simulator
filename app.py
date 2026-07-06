from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("ALPHA_VANTAGE_KEY")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

@app.route("/stock/<symbol>")
def get_stock_data(symbol):

    url = (
        f"https://www.alphavantage.co/query"
        f"?function=TIME_SERIES_DAILY"
        f"&symbol={symbol}"
        f"&outputsize=compact"
        f"&apikey={API_KEY}"
    )

    response = requests.get(url)
    data = response.json()

    time_series = data.get("Time Series (Daily)", {})

    prices = {}

    for date, values in time_series.items():
        prices[date] = float(values["4. close"])

    return jsonify(prices)

port = int(os.environ.get("PORT", 5000))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=port, debug=False)

@app.route("/debug")
def debug():
    return jsonify({
        "key_present": bool(API_KEY),
        "key_preview": API_KEY[:6] + "..." if API_KEY else "None"
    })