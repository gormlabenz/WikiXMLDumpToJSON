import aiohttp
import asyncio
import json
import os
import logging

# Konfiguration des Logging
logging.basicConfig(level=logging.WARNING,
                    format='%(asctime)s - %(levelname)s - %(message)s')


def get_json_file_iterator(folder_path):
    """ Erzeugt einen Iterator über alle JSON-Dateien im angegebenen Verzeichnis. """
    for filename in os.listdir(folder_path):
        if filename.endswith('.json'):
            yield filename


async def fetch_pageviews(session, article, year):
    base_url = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
    domain = "en.wikipedia.org"
    access = "all-access"
    agent = "user"

    start_date = f"{year}0101"
    end_date = f"{year}1231"

    url = f"{base_url}/{domain}/{access}/{agent}/{article['title']}/monthly/{start_date}/{end_date}"

    async with session.get(url) as response:
        if response.status == 200:
            data = await response.json()
            total_views = sum(item['views'] for item in data['items'])
            article['pageviews'] = total_views
            logging.debug(f"Pageviews for {article['title']}: {total_views}")
        else:
            article['pageviews'] = None
            logging.warning(f"Failed to retrieve data for {article['title']}")
    return article


async def process_articles(articles, year, output_folder):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_pageviews(session, article, year)
                 for article in articles]
        articles_with_views = await asyncio.gather(*tasks)

        filename = articles[0]['source_file']
        output_path = os.path.join(output_folder, filename)
        with open(output_path, 'w') as f:
            json.dump(articles_with_views, f, indent=4)
        logging.info(f"Processed articles saved in {output_path}")


def load_articles_from_json(json_file_iterator, folder_path, max_articles=500):
    articles = []
    while len(articles) < max_articles:
        try:
            filename = next(json_file_iterator)
            logging.debug(f"Loading articles from {filename}")
        except StopIteration:
            logging.info("No more files to process")
            break  # Keine weiteren Dateien zum Verarbeiten

        with open(os.path.join(folder_path, filename)) as f:
            file_articles = json.load(f)
            remaining_space = max_articles - len(articles)
            # Nur so viele Artikel hinzufügen, wie Platz ist
            articles_to_add = file_articles[:remaining_space]
            for article in articles_to_add:
                article['source_file'] = filename
                articles.append(article)

    return articles


async def main():
    folder_path = './1_wikitext_parser_output_2'
    output_folder = './3_pageviews'
    year = "2023"

    json_file_iterator = get_json_file_iterator(folder_path)

    while True:
        articles = load_articles_from_json(json_file_iterator, folder_path)
        if not articles:
            logging.info("No more articles to process")
            break

        await process_articles(articles, year, output_folder)

# Führt die asynchrone Hauptfunktion aus
asyncio.run(main())
