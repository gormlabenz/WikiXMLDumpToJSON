import fs from 'fs'
import path from 'path'
import wtf from 'wtf_wikipedia'
import wtfSummary from 'wtf-plugin-summary'
import cliProgress from 'cli-progress'

wtf.extend(wtfSummary)

const opt = {
  format: '[{bar}] {percentage}% | ETA: {eta_formatted}m | {value}/{total}',
}
const bar = new cliProgress.SingleBar(opt, cliProgress.Presets.shades_classic)

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
                id: article.id,
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

async function processChunk(chunk) {
  return Promise.all(chunk.map(readAndParseFile))
}

async function run() {
  if (!partsLength) {
    partsLength = await countFilesInDirectory(inputFolderPath)
  }

  const parts = Array.from({ length: partsLength }).map((_, i) => i)
  bar.start(parts.length * 100, 0)

  const chunkSize = 100
  for (let i = 0; i < parts.length; i += chunkSize) {
    const chunk = parts.slice(i, i + chunkSize)

    try {
      const chunkResult = await processChunk(chunk)
      chunkResult.forEach((parsedArticles, j) => {
        saveJson(
          parsedArticles,
          `${outputFolderPath}/parsed_wiki_part_${i + j}.json`
        )
      })
      bar.update(((i + chunk.length) * 100) / parts.length)
    } catch (error) {
      console.error('Ein Fehler ist aufgetreten:', error)
    }
  }

  bar.stop()
}

run()
