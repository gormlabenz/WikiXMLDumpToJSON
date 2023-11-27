import OpenAI from 'openai'
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
      name: 'extract_dates',
      description: 'Extracts dates and related information from text.',
      parameters: {
        type: 'object',
        properties: {
          dates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the event, limited to 3 words.',
                },
                summary: {
                  type: 'string',
                  description:
                    'A brief summary of the event, do not repeat the title, limited to 3 sentences.',
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
        required: ['dates'],
      },
    },
  ]

  const response = await openai.chat.completions.create({
    model,
    messages,
    functions,
    function_call: {
      name: 'extract_dates',
    },
  })

  return JSON.parse(response.choices[0].message.function_call.arguments)
}

getPostCompletion({
  text: `Paleo-Indians arrived in Alberta at least 10,000 years ago, toward the end of the last ice age. The first Europeans to visit Alberta were French Canadians during the late 18th century, working as fur traders. This area was granted by Charles II of England to the Hudson's Bay Company (HBC) in 1670, and rival fur trading companies were not allowed to trade in it. Other North American fur traders formed the North West Company (NWC) of Montreal to compete with the HBC in 1779. Peter Pond built Fort Athabasca on Lac la Biche in 1778. Roderick Mackenzie built Fort Chipewyan on Lake Athabasca ten years later in 1788. The extreme southernmost portion of Alberta was part of the French (and Spanish) territory of Louisiana and was sold to the United States in 1803. In the Treaty of 1818, the portion of Louisiana north of the Forty-Ninth Parallel was ceded to Great Britain. Fur trade expanded in the north, but bloody battles occurred between the rival HBC and NWC, and in 1821 the British government forced them to merge to stop the hostilities. The amalgamated Hudson's Bay Company dominated trade in Alberta until 1870 when the newly formed Canadian Government purchased Rupert's Land. Northern Alberta was included in the North-Western Territory until 1870, when it and Rupert's land became Canada's North-West Territories. The most significant treaties for Alberta are Treaty 6 (1876), Treaty 7 (1877) and Treaty 8 (1899). The District of Alberta was created as part of the North-West Territories in 1882. After a long campaign for autonomy, in 1905, the District of Alberta was enlarged and given provincial status, with the election of Alexander Cameron Rutherford as the first premier. Less than a decade later, the First World War presented special challenges to the new province as an extraordinary number of volunteers left relatively few workers to maintain services and production. On June 21, 2013, during the 2013 Alberta floods Alberta experienced heavy rainfall that triggered catastrophic flooding throughout much of the southern half of the province along the Bow, Elbow, Highwood and Oldman rivers and tributaries. A dozen municipalities in Southern Alberta declared local states of emergency on June 21 as water levels rose and numerous communities were placed under evacuation orders. In 2016, the Fort McMurray wildfire resulted in the largest fire evacuation of residents in Alberta's history, as more than 80,000 people were ordered to evacuate. Since 2020, Alberta has been affected by the COVID-19 pandemic.`,
}).then((resp) => console.log(JSON.stringify(resp, null, 2)))
