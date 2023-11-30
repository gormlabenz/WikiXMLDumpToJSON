import os
import csv
from collections import defaultdict
from tqdm import tqdm


def process_pageview_files(folder_path):
    pageviews = defaultdict(int)
    files = [f for f in os.listdir(folder_path) if os.path.isfile(
        os.path.join(folder_path, f))]

    for file_name in tqdm(files, desc="Verarbeite Dateien"):
        file_path = os.path.join(folder_path, file_name)
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                parts = line.strip().split()
                if len(parts) >= 3 and parts[1].startswith("en"):
                    article = parts[1]
                    try:
                        views = int(parts[2])
                        pageviews[article] += views
                    except ValueError:
                        # Ignoriert Fehler bei der Konvertierung
                        print(
                            f"Konnte Pageviews für {article} nicht konvertieren: {parts[2]}")

    return pageviews


def write_to_csv(pageviews, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Article', 'Pageviews'])

        for article, views in tqdm(pageviews.items(), desc="Schreibe CSV"):
            writer.writerow([article, views])


def main():
    input_folder = './pageview_dumps'  # Setzen Sie hier den Pfad zum Ordner
    output_file = 'pageviews.csv'      # Name der Ausgabe-CSV-Datei

    pageviews = process_pageview_files(input_folder)
    write_to_csv(pageviews, output_file)
    print(f"CSV file created at {output_file}")


if __name__ == "__main__":
    main()
