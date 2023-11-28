import fs from 'fs'
import path from 'path'
import wtf from 'wtf_wikipedia'
import wtfSummary from 'wtf-plugin-summary'
import cliProgress from 'cli-progress'

wtf.extend(wtfSummary)

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

// Setzen von inputFolderPath durch Kommandozeilenargument oder Standardwert
const defaultInputPath = './1_wikisplitter_output'
const outputFolderPath = './2_wikitext_parser_output'
const inputFolderPath = process.argv[2] || defaultInputPath

// partsLength basierend auf der Anwesenheit von inputFolderPath setzen
let partsLengthArgIndex =
  process.argv[2] && process.argv[2] !== defaultInputPath ? 3 : 2
let partsLength = process.argv[partsLengthArgIndex]
  ? parseInt(process.argv[partsLengthArgIndex], 10)
  : null

const countFilesInDirectory = (directoryPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err)
        return
      }

      let fileCount = 0
      files.forEach((file) => {
        if (fs.statSync(path.join(directoryPath, file)).isFile()) {
          fileCount++
        }
      })

      resolve(fileCount)
    })
  })
}

const readAndParseFile = (part) => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      `${inputFolderPath}/${part}_wiki_part.json`,
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
            bar.increment()

            const wikitext = article.revision.text
            const doc = wtf(wikitext)
            const historySection = doc.section('History')
            const coordinates = doc.coordinates()
            let shortDescription = null
            let description = null
            try {
              shortDescription = doc.summary()
            } catch {
              // console.error('error creating shortDescription', article.title)
            }
            try {
              let paragraphs = doc.paragraphs()
              if (paragraphs.length > 0) {
                description = paragraphs[0].text()
              }
            } catch {
              // console.error('error creating description', article.title)
            }

            if (
              historySection &&
              historySection.text().length &&
              coordinates.length
            ) {
              // console.log('---', article.title)
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

const saveJson = (data, fileName) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, JSON.stringify(data), (err) => {
      if (err) {
        console.error('Fehler beim Schreiben der Datei:', err)
        reject(err)
        return
      }

      resolve()
    })
  })
}

async function run() {
  if (!partsLength) {
    partsLength = await countFilesInDirectory(inputFolderPath)
  }
  // remove by WikiSplitter automatically generated siteinfo.json
  const parts = Array.from({ length: partsLength }).map((_, i) => i)
  bar.start(parts.length * 100, 0)
  Promise.all(parts.map(readAndParseFile))
    .then((allParsedArticles) => {
      allParsedArticles.forEach((parsedArticles, i) => {
        saveJson(
          parsedArticles,
          `${outputFolderPath}/parsed_wiki_part_${i}.json`
        )
      })
    })
    .catch((error) => {
      console.error('Ein Fehler ist aufgetreten:', error)
    })
}

run()
