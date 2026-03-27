import { useCallback, useEffect, useState } from 'react'
import {
  StudEngine,
  type HumanAction,
  type StudSnapshot,
} from './game/studEngine'
import { formatCard } from './game/cards'
import { handLabel, bestHandScore } from './game/pokerRank'
import { loadSettings, saveSettings } from './settings/storage'
import {
  DEFAULT_SETTINGS,
  STAKES_BY_TIER,
  TEMPO_HANDS_BY_PRESET,
  type GameSettings,
} from './settings/types'
import './App.css'

type Screen = 'menu' | 'settings' | 'play'

interface ActiveGame {
  engine: StudEngine
  snap: StudSnapshot
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [game, setGame] = useState<ActiveGame | null>(null)

  const refresh = useCallback(() => {
    setGame((g) => (g ? { engine: g.engine, snap: g.engine.snapshot() } : null))
  }, [])

  const startGame = useCallback(() => {
    const engine = new StudEngine(settings)
    engine.startSession()
    engine.beginHand()
    engine.runAiLoop()
    setGame({ engine, snap: engine.snapshot() })
    setScreen('play')
  }, [settings])

  const applySettings = useCallback((next: GameSettings) => {
    setSettings(next)
    saveSettings(next)
    setScreen('menu')
  }, [])

  if (screen === 'settings') {
    return (
      <SettingsScreen
        initial={settings}
        onSave={applySettings}
        onCancel={() => setScreen('menu')}
      />
    )
  }

  if (screen === 'play' && game) {
    return (
      <PlayScreen
        game={game}
        onRefresh={refresh}
        onQuit={() => {
          setGame(null)
          setScreen('menu')
        }}
      />
    )
  }

  return (
    <div className="app shell">
      <header className="topbar">
        <h1>Seven Card Stud</h1>
        <p className="tagline">
          Ante, bring-in, fixed limit — play money only.
        </p>
      </header>
      <main className="menu-main">
        <button type="button" className="btn primary" onClick={startGame}>
          New table
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setScreen('settings')}
        >
          Settings
        </button>
        <section className="menu-meta">
          <h2>Current setup</h2>
          <ul>
            <li>Opponents: {settings.opponentCount}</li>
            <li>Difficulty: {settings.difficulty}</li>
            <li>
              Tempo:{' '}
              {settings.useAdvancedTempo
                ? `${settings.handsPerLevel} hands / level`
                : settings.tempoPreset}
            </li>
            <li>Stakes: {settings.stakes}</li>
            <li>
              Starting stack: {STAKES_BY_TIER[settings.stakes].startingStack}
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}

function SettingsScreen({
  initial,
  onSave,
  onCancel,
}: {
  initial: GameSettings
  onSave: (s: GameSettings) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<GameSettings>(initial)

  return (
    <div className="app shell settings-screen">
      <header className="topbar">
        <h1>Settings</h1>
      </header>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
      >
        <label>
          Opponents (AI)
          <input
            type="range"
            min={1}
            max={6}
            value={draft.opponentCount}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                opponentCount: Number(e.target.value),
              }))
            }
          />
          <span className="range-val">{draft.opponentCount}</span>
        </label>

        <label>
          Difficulty
          <select
            value={draft.difficulty}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                difficulty: e.target.value as GameSettings['difficulty'],
              }))
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label>
          Tempo preset
          <select
            value={draft.tempoPreset}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                tempoPreset: e.target.value as GameSettings['tempoPreset'],
              }))
            }
          >
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
          </select>
          <span className="hint">
            (
            {TEMPO_HANDS_BY_PRESET[draft.tempoPreset]} hands before ante &amp;
            limits rise)
          </span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={draft.useAdvancedTempo}
            onChange={(e) =>
              setDraft((d) => ({ ...d, useAdvancedTempo: e.target.checked }))
            }
          />
          Advanced: custom hands per level
        </label>

        {draft.useAdvancedTempo ? (
          <label>
            Hands per level
            <input
              type="number"
              min={1}
              max={99}
              value={draft.handsPerLevel}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  handsPerLevel: Number(e.target.value) || DEFAULT_SETTINGS.handsPerLevel,
                }))
              }
            />
          </label>
        ) : null}

        <label>
          Stakes tier
          <select
            value={draft.stakes}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                stakes: e.target.value as GameSettings['stakes'],
              }))
            }
          >
            <option value="low">Low</option>
            <option value="mid">Mid</option>
            <option value="high">High</option>
          </select>
        </label>

        <p className="stakes-preview">
          Ante {STAKES_BY_TIER[draft.stakes].ante} · Small{' '}
          {STAKES_BY_TIER[draft.stakes].smallBet} · Big{' '}
          {STAKES_BY_TIER[draft.stakes].bigBet} · Stack{' '}
          {STAKES_BY_TIER[draft.stakes].startingStack}
        </p>

        <div className="form-actions">
          <button type="submit" className="btn primary">
            Save
          </button>
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function PlayScreen({
  game,
  onRefresh,
  onQuit,
}: {
  game: ActiveGame
  onRefresh: () => void
  onQuit: () => void
}) {
  const { engine, snap } = game

  useEffect(() => {
    if (
      snap.phase !== 'betting' ||
      snap.humanMustAct ||
      snap.actionIndex === null
    ) {
      return
    }
    engine.runAiLoop()
    onRefresh()
  }, [engine, onRefresh, snap.actionIndex, snap.humanMustAct, snap.phase])

  const legal = snap.humanMustAct ? engine.legalHumanActions() : []

  const act = (a: HumanAction) => {
    engine.applyHuman(a)
    onRefresh()
  }

  const continueHand = () => {
    engine.acknowledgeHandSummary()
    engine.runAiLoop()
    onRefresh()
  }

  if (snap.phase === 'youBusted' || snap.phase === 'youWonTable') {
    return (
      <div className="app shell end-screen">
        <h1>{snap.phase === 'youBusted' ? 'Game over' : 'You won the table'}</h1>
        <p>{snap.message}</p>
        <div className="form-actions">
          <button type="button" className="btn primary" onClick={onQuit}>
            Back to menu
          </button>
        </div>
      </div>
    )
  }

  const showAllHoles = snap.phase === 'handSummary'

  return (
    <div className="app play">
      <header className="play-bar">
        <div>
          <strong>Hand {snap.handNumber}</strong>
          <span className="muted"> · Level {snap.level}</span>
        </div>
        <div className="play-bar-right">
          <span className="pot">Pot {snap.pot}</span>
          <button type="button" className="btn tiny ghost" onClick={onQuit}>
            Quit
          </button>
        </div>
      </header>

      <p className="status-msg">{snap.message}</p>

      <div className="table-wrap">
        <div className="players-row">
          {snap.players.map((p, idx) => {
            const isDealer = idx === snap.dealerIndex
            const isActor = idx === snap.actionIndex && snap.phase === 'betting'
            const hole =
              p.isHuman || showAllHoles
                ? p.hole.map((c, i) => (
                    <span key={i} className="card hole">
                      {formatCard(c)}
                    </span>
                  ))
                : p.hole.map((_, i) => (
                    <span key={i} className="card back">
                      ●
                    </span>
                  ))
            const up = p.up.map((c, i) => (
              <span key={i} className="card up">
                {formatCard(c)}
              </span>
            ))
            const best =
              showAllHoles && !p.folded
                ? bestHandScore([...p.hole, ...p.up])
                : null
            return (
              <div
                key={p.id}
                className={`player-card ${isActor ? 'acting' : ''} ${p.folded ? 'folded' : ''}`}
              >
                <div className="player-head">
                  <span>{p.name}</span>
                  {isDealer ? <span className="dealer-pill">D</span> : null}
                  {p.folded ? <span className="fold-pill">Fold</span> : null}
                </div>
                <div className="stack">Stack {p.stack}</div>
                <div className="cards-row">{hole}</div>
                <div className="cards-row up">{up}</div>
                {best ? (
                  <div className="best-hand">{handLabel(best)}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="street-pill">
        {snap.phase === 'betting'
          ? `Street ${snap.street} · Ante ${snap.stakes.ante} · Small ${snap.stakes.smallBet} · Big ${snap.stakes.bigBet}`
          : snap.phase}
      </div>

      {snap.phase === 'handSummary' ? (
        <div className="summary-panel">
          <p>{snap.lastSummary}</p>
          <button type="button" className="btn primary" onClick={continueHand}>
            Next hand
          </button>
        </div>
      ) : null}

      {snap.humanMustAct ? (
        <div className="actions-bar">
          {legal.includes('fold') ? (
            <button type="button" className="btn danger" onClick={() => act({ type: 'fold' })}>
              Fold
            </button>
          ) : null}
          {legal.includes('check') ? (
            <button type="button" className="btn ghost" onClick={() => act({ type: 'check' })}>
              Check
            </button>
          ) : null}
          {legal.includes('call') ? (
            <button type="button" className="btn" onClick={() => act({ type: 'call' })}>
              Call
            </button>
          ) : null}
          {legal.includes('raise') ? (
            <button type="button" className="btn accent" onClick={() => act({ type: 'raise' })}>
              {snap.street === 3 && snap.stakes.bringIn < snap.stakes.smallBet
                ? 'Complete / Raise'
                : 'Raise'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
