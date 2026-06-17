# BigQuery Release Notes Hub & Social Compiler 🚀

An interactive web console designed to fetch, parse, search, and compile Google BigQuery release updates into developer-friendly tweets. Built with **Python Flask** on the backend and a premium **Vanilla HTML, CSS, and JS** frontend.

---

## 🌟 Features

*   **Granular XML Parsing**: Parses and splits the official BigQuery Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) at HTML heading structures, letting you manage individual release items independently even if they occur on the same day.
*   **Premium Dark UI**: Implements next-gen glassmorphism styling (`backdrop-filter: blur`), glowing neon highlights, clean custom typography (Inter and Outfit), and micro-animations.
*   **Live Filtering & Indexing**: Real-time keyword search and category matrix selection (Feature, Announcement, Issue, Deprecation, etc.).
*   **Dynamic Tweet Compiler**: 
    *   Select one or multiple updates to aggregate them into a custom summary.
    *   Automatic character length estimation, treating all hyperlinks as exactly **23 characters** (X/Twitter shortener logic).
    *   Visual character capacity warnings (warning/error styling thresholds).
*   **On-Demand Sync**: Quick reload functionality with skeleton loader templates and an in-memory cache system.

---

## 📁 Repository Structure

```text
bigquery_releaser/
├── app.py                  # Flask Application Server (XML download, parsing, and JSON API)
├── requirements.txt        # Python library manifest
├── README.md               # Setup and project guide
├── .gitignore              # Git ignore rules for Python/IDEs/OS
├── templates/
│   └── index.html          # Base semantic layout & client views
└── static/
    ├── style.css           # Glassmorphism styling sheets
    └── app.js              # State controls, search filtering, and tweet compiler logic
```

---

## 🔧 Installation & Setup

### Prerequisites
Make sure you have **Python 3.8+** and **pip** installed on your system.

### 1. Clone & Navigate
```bash
git clone https://github.com/nicolasairomano/antigravity-event-talks-app.git
cd bigquery_releaser
```

### 2. Install Dependencies
Install Flask from the requirements manifest:
```bash
pip install -r requirements.txt
```

### 3. Launch the Server
Start the development server:
```bash
python app.py
```

### 4. Open in Browser
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🖥️ Technologies Used

*   **Backend**: Python, Flask, `xml.etree.ElementTree` (Standard XML parser)
*   **Frontend**: Plain JavaScript (ES6+), Vanilla CSS (Flexbox & Grid), HTML5 (Descriptive semantic layout)
*   **Icons**: FontAwesome v6 (loaded via CDN)
*   **Typography**: Google Fonts (Inter, Outfit)
