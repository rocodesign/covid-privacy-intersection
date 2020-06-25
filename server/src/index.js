import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import PSIClient from '@openmined/psi.js/client/wasm/es'
import PSIServer from '@openmined/psi.js/server/wasm/es'

// this should be stored in the database
const infectedTokens = []

const app = express()
app.use(cors())
app.use(bodyParser({ extended: true }))

const PORT = process.env.PORT || 3100

const fpr = 0.001 // false positive rate (0.1%)
const numClientElements = 10 // Size of the client set to check

// these should be stored in db.
const serverInputs = ['Element 1', 'Element 2']

const initializeClient = async () => {
  const psi = await PSIClient()

  const client = psi.client.createWithNewKey()

  return client
}

let serverInstance
const initializeServer = async () => {
  if (!serverInstance) {
    const psi = await PSIServer()

    serverInstance = psi.server.createWithNewKey()
  }
  return serverInstance
}

const processIntersection = async () => {
  const c = await initializeClient()
  const s = await initializeServer()

  const serverSetup = s.createSetupMessage(fpr, numClientElements, serverInputs)

  const clientRequest = c.createRequest(['Element 1'])

  const serverResponse = s.processRequest(clientRequest)

  // Client computes the intersection and the server has learned nothing!
  const intersectionSize = c.getIntersectionSize(serverSetup, serverResponse)

  console.warn('initialized client and server', intersectionSize)
}

processIntersection()

app.post('/infected', (req, res) => {
  console.warn('infected', req.body)
  serverInputs.push(...req.body.tokens)
  res.json({ status: 'success' })
})

let currentHandshake

app.post('/handshake', (req, res) => {
  if (currentHandshake) {
    currentHandshake.res.json({ token: req.body.token })
    res.json({ token: currentHandshake.token })
    currentHandshake = null
  } else {
    currentHandshake = {
      res,
      token: req.body.token,
    }
  }
})

app.post('/check-infection', async (req, res) => {
  console.warn('req.body', req.body)
  if (serverInputs.length === 0) return res.json({ status: false })
  const s = await initializeServer()
  const serverSetup = s.createSetupMessage(fpr, req.body.num, serverInputs)
  const serverResponse = s.processRequest(req.body.clientRequest)
  res.json({ serverSetup, serverResponse })
})

app.listen(PORT, () => console.log(`server running on ${PORT}`))
