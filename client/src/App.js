import React, { useState, useCallback } from 'react'
import Button from '@material-ui/core/Button'
import axios from 'axios'
import { useInterval } from './hooks'
import { genToken } from './token'
import { getRequest, getIntersection } from './psi'

import './App.css'

const API_URL = 'http://localhost:3100/'

function handleResponses(response) {
  console.warn('Reply from', response.config.url, response.data)
  return response.data
}

// We don't really need the clientId here, it's here just to hack the handshake
// this will send our tokens to the server
function infectedHandler(tokens, client) {
  axios.post(`${API_URL}infected`, { tokens, client }).then(handleResponses)
}

// We simulate the handshake done by bluetooth through this button.
function handshake(token) {
  return axios.post(`${API_URL}handshake`, { token }).then(handleResponses)
}

// We check the infections on the server.
async function check(tokens) {
  const clientRequest = await getRequest(tokens)
  return axios
    .post(`${API_URL}check-infection`, { clientRequest, num: tokens.length })
    .then(handleResponses)
    .then((data) => getIntersection(data))
}

const clientId = genToken()

const statuses = ['Healthy', 'Infected', 'Exposed']

function App() {
  // 0 healthy, 1 infected, 2 possibly infected
  const [status, setStatus] = useState(0)
  const [tokens, setTokens] = useState([genToken()])
  const [handshakes, setHandshakes] = useState([])
  const [handshakeState, setHandshakeState] = useState(0)
  const [lastToken] = tokens.slice(-1)

  useInterval(() => {
    setTokens([...tokens, genToken()])
  }, 1000)

  const handleInfected = useCallback(() => {
    infectedHandler(tokens, clientId)
    setStatus(1)
  }, [tokens])

  const checkExposure = useCallback(() => {
    check(handshakes).then((aaa) => {
      if (aaa > 0) {
        setStatus(2)
      }
    })
  }, [handshakes])

  const handleHandshake = useCallback(() => {
    setHandshakeState(1)
    handshake(lastToken).then(
      ({ token }) => {
        setHandshakes([...handshakes, token])
        setHandshakeState(0)
      },
      () => setHandshakeState(0)
    )
  }, [lastToken, handshakes])

  return (
    <div className="App">
      <header className="App-header">
        <p>
          My status is{' '}
          <span
            style={{
              backgroundColor: ['green', 'pink', 'orange'][status],
              padding: 4,
              color: 'white',
            }}
          >
            {statuses[status]}
          </span>
        </p>

        <p>Client ID is {clientId}</p>
        <p>
          Current token is {lastToken}, token count: {tokens.length}
        </p>
        <p>Handshakes:</p>
        {handshakes.map((h) => (
          <div key={h}>{h}</div>
        ))}
        <Button
          variant="contained"
          style={{ marginBottom: 5 }}
          color="primary"
          onClick={handleInfected}
        >
          I'm infected
        </Button>
        <Button
          variant="contained"
          style={{ marginBottom: 5 }}
          color="primary"
          disabled={handshakes.length === 0}
          onClick={checkExposure}
        >
          Check exposure
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleHandshake}
          disabled={handshakeState !== 0}
        >
          Handshake
        </Button>
      </header>
    </div>
  )
}

export default App
