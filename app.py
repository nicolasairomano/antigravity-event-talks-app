import os
import re
import urllib.request
import xml.etree.ElementTree as ET
import html as html_lib
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
feed_cache = {
    "data": None,
    "timestamp": 0
}

def clean_html_to_text(html_content):
    """Strips HTML tags and normalizes whitespace for text summaries (like tweets)."""
    # Replace block elements with space to avoid merging words
    text = re.sub(r'<(p|h1|h2|h3|li|br|div|tr|td)[^>]*>', ' ', html_content)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_lib.unescape(text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_feed_xml(xml_data):
    """Parses BigQuery release notes Atom feed and extracts structured updates."""
    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    entries_list = []
    
    # Atom feeds use <entry> elements
    entries = root.findall("atom:entry", ns)
    for entry_idx, entry in enumerate(entries):
        title_elm = entry.find("atom:title", ns)
        updated_elm = entry.find("atom:updated", ns)
        link_elm = entry.find("atom:link", ns)
        content_elm = entry.find("atom:content", ns)
        
        date_str = title_elm.text if title_elm is not None else "Unknown Date"
        date_iso = updated_elm.text if updated_elm is not None else ""
        link_href = link_elm.attrib.get("href", "https://cloud.google.com/bigquery/docs/release-notes") if link_elm is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        content_html = content_elm.text if content_elm is not None else ""
        
        # Split content by <h3> headers to get individual updates
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        
        # If there's text before the first <h3>, capture it as "General"
        prefix = parts[0].strip()
        sub_index = 0
        if prefix and len(prefix) > 20: # ignore small whitespace/artifacts
            plain_text = clean_html_to_text(prefix)
            entries_list.append({
                "id": f"bq-{entry_idx}-{sub_index}",
                "date": date_str,
                "date_iso": date_iso,
                "category": "General",
                "html": prefix,
                "text": plain_text,
                "link": link_href
            })
            sub_index += 1
            
        for i in range(1, len(parts), 2):
            category = parts[i].strip()
            item_html = parts[i+1].strip() if i+1 < len(parts) else ""
            
            # Skip empty entries
            if not item_html:
                continue
                
            plain_text = clean_html_to_text(item_html)
            
            entries_list.append({
                "id": f"bq-{entry_idx}-{sub_index}",
                "date": date_str,
                "date_iso": date_iso,
                "category": category,
                "html": item_html,
                "text": plain_text,
                "link": link_href
            })
            sub_index += 1
            
    return entries_list

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Return cache if available and not forcing refresh
    if feed_cache["data"] is not None and not force_refresh:
        return jsonify({
            "status": "success",
            "source": "cache",
            "data": feed_cache["data"]
        })
        
    try:
        url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityReleaseNotesFetcher/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        updates = parse_feed_xml(xml_data)
        
        # Cache the result
        feed_cache["data"] = updates
        
        return jsonify({
            "status": "success",
            "source": "network",
            "data": updates
        })
    except Exception as e:
        # Fall back to cache if network call fails
        if feed_cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": f"Network fetch failed, returned cached data. Error: {str(e)}",
                "source": "cache_fallback",
                "data": feed_cache["data"]
            })
            
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Ensure templates folder exists
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    app.run(debug=True, port=5000)
