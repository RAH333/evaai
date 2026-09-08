#!/usr/bin/env node
// Pushes agents/<name>.jsonc to your AssemblyAI account.
//
//   npm run publish
//   AGENT=exa-search npm run publish
//
// The first run creates the agent and writes AGENT_ID_<NAME> to .env. Every
// run after that updates that same agent, so each file keeps its own agent and
// a browser tab or phone number pointed at one picks up the change on the next
// call.

import { loadEnv, publishAgent, readAgent, reportErrors, required } from './lib.mjs'
import fs from 'fs' // Dynamic file system library for prompt injection

reportErrors()
loadEnv()
required('ASSEMBLYAI_API_KEY', 'get one at https://assemblyai.com')

const name = process.env.AGENT || 'minimal'
const agent = readAgent(name)

// Inject the prompt from an independent markdown file to bypass strict JSON rules
try {
  agent.system_prompt = fs.readFileSync(`./agents/prompt.md`, 'utf8');
} catch (e) {
  try {
    agent.system_prompt = fs.readFileSync(`prompt.md`, 'utf8');
  } catch (err) {
    console.log('\nWarning: prompt.md file was not found. Using internal fallback setting.');
  }
}

const { id, created, saved, key } = await publishAgent(agent, { name })

console.log(`${created ? 'Created' : 'Updated'} "${agent.name}" from agents/${name}`)
console.log(`${key}=${id}`)
if (created && !saved) {
  console.log(`Could not write .env. Set ${key} yourself to keep updating this agent.`)
} else if (created) {
  console.log('Saved to .env.')
}

// Tools with an http block are called by AssemblyAI itself, so they work the
// same in a browser tab and on a phone call. Anything else has to be answered
// by whoever holds the session, and a phone call has nobody to answer it.
const unanswered = (agent.tools ?? []).filter((tool) => !tool.http).map((t) => t.name)
if (unanswered.length) {
  console.log(
    `\nWarning: ${unanswered.join(', ')} ${unanswered.length > 1 ? 'have' : 'has'} no http configuration, ` +
      'so nothing answers it on a phone call.'
  )
}
