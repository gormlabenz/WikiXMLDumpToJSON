import aiohttp
import asyncio
import json


async def fetch_pageviews(session, article, year):
    base_url = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
    domain = "en.wikipedia.org"
    access = "all-access"
    agent = "user"

    start_date = f"{year}0101"  # Erster Tag des Jahres
    end_date = f"{year}1231"    # Letzter Tag des Jahres

    url = f"{base_url}/{domain}/{access}/{agent}/{article}/monthly/{start_date}/{end_date}"

    async with session.get(url) as response:
        if response.status == 200:
            data = await response.json()
            return article, data
        else:
            return article, None


async def main():
    with open('./articles_with_dates.json') as f:
        articles = json.load(f)
        articles_titles = [article['title'] for article in articles]
        print(f"Number of articles: {len(articles_titles)}")
    # Start- und Enddatum im Format YYYYMMDD
    year = "2023"
    async with aiohttp.ClientSession() as session:
        tasks = []
        for articles_title in articles_titles:
            task = asyncio.ensure_future(fetch_pageviews(
                session, articles_title, year))
            tasks.append(task)

        responses = await asyncio.gather(*tasks)

        for article, data in responses:
            if data:
                total_views = sum(item['views'] for item in data['items'])
                print(
                    f"Total Pageviews for {article} in {year}: {total_views}")
            else:
                print(f"Failed to retrieve data for {article}")

# Führt die asynchrone Hauptfunktion aus
asyncio.run(main())
