// core/ai/callAI.js

'use strict'

const { OpenAI } = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AI_MODEL =
  process.env.AI_MODEL || 'gpt-5-mini'

async function callAI({
  systemPrompt,
  userPrompt,
  devLog,
  onToken
}) {

  try {

    devLog?.(
      `Calling AI (model: ${AI_MODEL}, prompt: ${userPrompt.length} chars)`
    )
    devLog?.(
      `system Prompt : ${systemPrompt}`
    )

    devLog?.(
      `Final Prompt : ${userPrompt}`
    )

    const stream =
      await openai.chat.completions.create({

        model: AI_MODEL,

        stream: true,

        max_completion_tokens: 16000,

        response_format: {
          type: 'json_object'
        },

        messages: [

          {
            role: 'system',
            content: systemPrompt
          },

          {
            role: 'user',
            content: userPrompt
          }

        ]

      })

    let finalText = ''

    // buffer for clean logs
    let buffer = ''

    for await (const chunk of stream) {

      const token =
        chunk.choices?.[0]?.delta?.content || ''

      if (!token) continue

      finalText += token

      buffer += token

      // realtime frontend
      onToken?.(token)

      // flush every 300 chars
      if (buffer.length >= 300) {

        devLog?.(
          `AI_STREAM:\n${buffer}`
        )

        buffer = ''

      }

    }

    // remaining buffer
    if (buffer.trim()) {

      devLog?.(
        `AI_STREAM:\n${buffer}`
      )

    }

    devLog?.(
      `AI response completed (${finalText.length} chars)`
    )

    return finalText

  }

  catch (err) {

    devLog?.(
      `AI call failed: ${err.message}`
    )

    throw err

  }

}

module.exports = {
  callAI
}