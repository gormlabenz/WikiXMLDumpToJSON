import requests
import os
from datetime import datetime, timedelta


def download_pageviews(start_date, end_date, download_folder):
    current_date = start_date
    while current_date <= end_date:
        for hour in range(24):
            # Format the hour to be two digits
            formatted_hour = f"{hour:02d}"

            # Create the download URL
            url = f"https://dumps.wikimedia.org/other/pageviews/{current_date.year}/{current_date.year}-{current_date.month:02d}/pageviews-{current_date.year}{current_date.month:02d}{current_date.day:02d}-{formatted_hour}0000.gz"

            # Create the path for the file to be saved
            file_name = url.split('/')[-1]
            file_path = os.path.join(download_folder, file_name)

            # Download and save the file
            print(f"Downloading {url}")
            response = requests.get(url)
            if response.status_code == 200:
                with open(file_path, 'wb') as file:
                    file.write(response.content)
                print(f"Saved to {file_path}")
            else:
                print(f"Failed to download {url}")

        # Move to the next day
        current_date += timedelta(days=1)


# Define the date range for October 2023
start_date = datetime(2023, 10, 1)
end_date = datetime(2023, 10, 31)

# Define the download folder
download_folder = "pageview_dumps"
os.makedirs(download_folder, exist_ok=True)

# Start the download process
download_pageviews(start_date, end_date, download_folder)
