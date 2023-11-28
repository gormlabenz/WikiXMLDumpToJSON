import OpenAI from 'openai'
import fs from 'fs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const model = 'gpt-3.5-turbo-1106'

async function getPostCompletion({ text }) {
  const messages = [
    {
      role: 'system',
      content:
        'Your task is to extract dates and related event information from the provided text.',
    },
    {
      role: 'user',
      content: `${text}`,
    },
  ]
  const functions = [
    {
      name: 'extract_events',
      description: 'Extracts events and related information from text.',
      parameters: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description:
                    "Title of the event, don't include date, limited to 3 words.",
                },
                summary: {
                  type: 'string',
                  description:
                    "A brief summary of the event, don't repeat the title, limited to 3 sentences.",
                },
                dates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: {
                        type: 'string',
                        description:
                          'Date of the event in YYYY-MM-DD format. MM and DD are optional based on granularity.',
                        pattern: '^-?[0-9]{4}(-[0-9]{2})?(-[0-9]{2})?$',
                      },
                      granularity: {
                        type: 'string',
                        description:
                          'Specifies the level of detail of the date: day, month, year, decade, century, or millennium.',
                        enum: [
                          'day',
                          'month',
                          'year',
                          'decade',
                          'century',
                          'millennium',
                        ],
                      },
                    },
                    required: ['date', 'granularity'],
                  },
                },
              },
              required: ['title', 'summary', 'dates'],
            },
          },
        },
        required: ['events'],
      },
    },
  ]

  const response = await openai.chat.completions.create({
    model,
    messages,
    functions,
    function_call: {
      name: 'extract_events',
    },
  })

  return JSON.parse(response.choices[0].message.function_call.arguments)
}

async function processArticles() {
  try {
    const jsonString = await fs.promises.readFile(
      './articles_with_dates.json',
      'utf8'
    )
    const articles = JSON.parse(jsonString)

    for (const [index, article] of articles.entries()) {
      console.log(`Processing article ${index + 1} of ${articles.length}`)

      if (article.sentencesWithDates.length === 0) continue

      const { events } = await getPostCompletion({
        text: article.sentencesWithDates,
      })

      article.events = events
      const articleJsonString = JSON.stringify(article, null, 2)

      await fs.promises.writeFile(
        `./articles_with_events/${article.title}.json`,
        articleJsonString
      )

      console.log(`${article.title} has been written successfully`)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

processArticles()
