import fs from 'fs'
import wtf from 'wtf_wikipedia'
import wtfSummary from 'wtf-plugin-summary'
wtf.extend(wtfSummary)

// Extrahieren des Kommandozeilenarguments für die Länge
const partsLength = process.argv[2] ? parseInt(process.argv[2], 10) : 5

// Überprüfen, ob das Argument eine gültige Zahl ist
if (isNaN(partsLength) || partsLength <= 0) {
  console.error('Bitte geben Sie eine gültige Zahl für die Länge der Teile an.')
  process.exit(1)
}

const parts = Array.from({ length: partsLength }).map((_, i) => i)

const readAndParseFile = (part) => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      `extracted_files/${part}_wiki_part.json`,
      'utf8',
      (err, data) => {
        if (err) {
          console.error('Fehler beim Lesen der Datei:', err)
          reject(err)
          return
        }

        let articles = JSON.parse(data)
        const parsedArticles = articles
          .map((article) => {
            const wikitext = article.revision.text
            const doc = wtf(wikitext)
            const historySection = doc.section('History')
            const coordinates = doc.coordinates()
            let shortDescription = null
            let description = null
            try {
              shortDescription = doc.summary()
            } catch {
              console.error('error creating shortDescription')
            }
            try {
              let paragraphs = doc.paragraphs()
              if (paragraphs.length > 0) {
                description = paragraphs[0].text()
              }
            } catch {
              console.error('error creating description')
            }

            if (
              historySection &&
              historySection.text().length &&
              coordinates.length
            ) {
              console.log('---', article.title)
              return {
                title: article.title,
                history: historySection.text(),
                coordinates: coordinates[coordinates.length - 1],
                shortDescription,
                description,
              }
            } else {
              return null
            }
          })
          .filter((article) => article !== null)

        resolve(parsedArticles)
      }
    )
  })
}

Promise.all(parts.map(readAndParseFile))
  .then((allParsedArticles) => {
    const combinedArticles = allParsedArticles.flat()
    fs.writeFile(
      'parsed_articles.json',
      JSON.stringify(combinedArticles, null, 2),
      'utf8',
      (err) => {
        if (err) {
          console.error('Fehler beim Schreiben der Datei:', err)
        } else {
          console.log('Artikel wurden als JSON gespeichert.')
        }
      }
    )
  })
  .catch((error) => {
    console.error('Ein Fehler ist aufgetreten:', error)
  })
