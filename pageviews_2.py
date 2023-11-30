import json
import os
import requests
from concurrent.futures import ThreadPoolExecutor
from tenacity import retry, stop_after_attempt, wait_random_exponential
import logging
import csv
from urllib.parse import quote


# Konfiguration
input_folder = '2_wikitext_parser_output'
output_folder = '3_pageviews'
log_file = 'fetched_articles.log'
max_retries = 3
retry_wait = 2  # Sekunden
max_workers = 50  # Maximale Anzahl paralleler Anfragen
year = "2023"

csv_file = None
csv_writer = None

# Stellen Sie sicher, dass die Ausgabeordner existieren
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

logging.basicConfig(level=logging.WARNING,
                    format='%(asctime)s %(levelname)s:%(message)s')


# Retry-Strategie für API-Aufrufe
def fetch_pageviews(article):
    logging.debug(f"Fetching pageviews for {article['title']}")
    base_url = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
    domain = "en.wikipedia.org"
    access = "all-access"
    agent = "user"
    headers = {
        'User-Agent': 'Chronosphere/1.0 (gorms.bot@gmail.com)'
    }

    start_date = f"{year}0101"
    end_date = f"{year}1231"

    url = f"{base_url}/{domain}/{access}/{agent}/{quote(article['title'])}/monthly/{start_date}/{end_date}"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            total_views = sum(item['views'] for item in data['items'])
            article['pageviews'] = total_views
            logging.debug(f"Pageviews for {article['title']}: {total_views}")
            csv_writer.writerow([article['title'], total_views, 'Success'])
        else:
            article['pageviews'] = None
            logging.warning(
                f"Failed to retrieve data for {article['title']}. HTTP Status: {response.status_code}, Response: {response.text}")
            csv_writer.writerow([article['title'], 'N/A', 'Failed'])
    except Exception as e:
        article['pageviews'] = None
        logging.warning(
            f"Exception while fetching data for {article['title']}: {type(e).__name__}: {e}")
        csv_writer.writerow([article['title'], 'N/A', f'Error: {e}'])

    return article


def process_articles(file_path):
    logging.info(f"Processing articles in {file_path}")

    with open(file_path, 'r') as file:
        articles = json.load(file)

    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for article in articles:
            result = executor.submit(fetch_pageviews, article)
            results.append(result)

    # Speichern der Ergebnisse
    logging.info(f"{len(results)} results for {file_path}")
    for result in results:
        data = result.result()
        if data:
            output_file = os.path.join(output_folder, f"{data['title']}.json")
            with open(output_file, 'w') as file:
                json.dump(data, file)


def process_file(file_name):
    logging.info(f"Processing file {file_name}")
    file_path = os.path.join(input_folder, file_name)
    process_articles(file_path)

    with open(log_file, 'a') as log:
        log.write(f"{file_name}\n")


def process_chunk(chunk):
    logging.info(f"Processing chunk with {len(chunk)} files.")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for file_name in chunk:
            executor.submit(process_file, file_name)


def main():
    logging.info("Starting main process.")

    global csv_file, csv_writer
    csv_file = open('pageviews.csv', 'w', newline='', encoding='utf-8')
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow(['Title', 'Pageviews', 'Status'])

    # Verarbeitung aller Dateien im Eingabeordner
    files = os.listdir(input_folder)
    # splite files in chunks
    chunks = [files[i:i + max_workers]
              for i in range(0, len(files), max_workers)]
    for chunk in chunks:
        process_chunk(chunk)

    csv_file.close()


if __name__ == "__main__":
    main()
