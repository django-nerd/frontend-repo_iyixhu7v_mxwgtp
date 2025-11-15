import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Spline from '@splinetool/react-spline'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function useAuthToken() {
  const [token, setToken] = useState(localStorage.getItem('sb_token') || '')
  useEffect(() => {
    if (token) localStorage.setItem('sb_token', token)
  }, [token])
  return { token, setToken }
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <header className="relative h-[60vh] overflow-hidden">
        <Spline scene="https://prod.spline.design/pDXeCthqjmzYX5Zk/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0b10]/90 pointer-events-none" />
        <div className="absolute bottom-10 left-0 right-0 mx-auto max-w-5xl px-6">
          <h1 className="text-4xl md:text-6xl font-semibold">MindCraft AI</h1>
          <p className="text-zinc-300 mt-3 max-w-2xl">Upload PDFs or YouTube links. Get structured notes, quizzes, flashcards, and search semantically across your knowledge.</p>
          <div className="mt-5 flex gap-3">
            <Link to="/" className="px-4 py-2 rounded bg-indigo-500 hover:bg-indigo-400">Upload</Link>
            <Link to="/dashboard" className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Dashboard</Link>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}

function UploadPage() {
  const { token } = useAuthToken()
  const [pdf, setPdf] = useState(null)
  const [status, setStatus] = useState('')
  const [yt, setYt] = useState('')
  const nav = useNavigate()

  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const sendPDF = async () => {
    if (!pdf) return
    const form = new FormData()
    form.append('file', pdf)
    try {
      setStatus('Uploading and processing...')
      const res = await axios.post(`${BACKEND}/process-pdf`, form, auth)
      setStatus('Queued. Generating notes, quizzes, flashcards...')
      nav('/dashboard')
    } catch (e) {
      setStatus(e?.response?.data?.detail || 'Error')
    }
  }

  const sendYT = async () => {
    if (!yt) return
    try {
      setStatus('Downloading and transcribing...')
      await axios.post(`${BACKEND}/process-youtube`, { url: yt }, auth)
      setStatus('Queued. Generating notes, quizzes, flashcards...')
      nav('/dashboard')
    } catch (e) {
      setStatus(e?.response?.data?.detail || 'Error')
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-xl font-semibold mb-2">Upload PDF</h3>
        <input type="file" accept="application/pdf" onChange={e=>setPdf(e.target.files[0])} className="block w-full text-sm text-zinc-300" />
        <button onClick={sendPDF} className="mt-4 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Process PDF</button>
      </div>
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-xl font-semibold mb-2">YouTube Link</h3>
        <input value={yt} onChange={e=>setYt(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 rounded bg-zinc-800" />
        <button onClick={sendYT} className="mt-4 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Transcribe & Process</button>
      </div>
      {status && <div className="md:col-span-2 text-sm text-zinc-300">{status}</div>}
    </div>
  )
}

function Dashboard() {
  const { token } = useAuthToken()
  const [docs, setDocs] = useState([])
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  useEffect(() => {
    axios.get(`${BACKEND}/user/documents`, auth).then(r=>setDocs(r.data)).catch(()=>{})
  }, [])

  const search = async (docId) => {
    const r = await axios.post(`${BACKEND}/semantic-search`, { document_id: docId, query }, auth)
    setResult(r.data)
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Semantic search query" className="flex-1 px-3 py-2 rounded bg-zinc-800" />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {docs.map(d=> (
          <div key={d.id} className="p-4 rounded bg-zinc-900 border border-zinc-800">
            <div className="font-medium">{d.title}</div>
            <div className="text-xs text-zinc-400">{d.type}</div>
            <div className="mt-3 flex gap-2">
              <Link className="px-3 py-1 rounded bg-zinc-800" to={`/notes/${d.id}`}>Notes</Link>
              <Link className="px-3 py-1 rounded bg-zinc-800" to={`/quiz/${d.id}`}>Quiz</Link>
              <Link className="px-3 py-1 rounded bg-zinc-800" to={`/flash/${d.id}`}>Flashcards</Link>
              <button onClick={()=>search(d.id)} className="px-3 py-1 rounded bg-indigo-600">Search</button>
            </div>
          </div>
        ))}
      </div>
      {result && <pre className="mt-6 text-xs text-zinc-300 whitespace-pre-wrap">{JSON.stringify(result,null,2)}</pre>}
    </div>
  )
}

function NotesPage() {
  const { token } = useAuthToken()
  const [data, setData] = useState(null)
  const id = location.pathname.split('/').pop()
  useEffect(()=>{
    axios.get(`${BACKEND}/notes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>setData(r.data))
  },[id])
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-3">Structured Notes</h2>
      <div className="prose prose-invert max-w-none whitespace-pre-wrap">{data?.notes_json || 'Generating...'}</div>
    </div>
  )
}

function QuizPage() {
  const { token } = useAuthToken()
  const [data, setData] = useState({ mcqs_json: [], tf_json: [] })
  const [answers, setAnswers] = useState({})
  const id = location.pathname.split('/').pop()
  useEffect(()=>{
    axios.get(`${BACKEND}/quizzes/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>setData(r.data))
  },[id])

  const answer = async (qid, correct) => {
    setAnswers(a=>({ ...a, [qid]: correct }))
    try {
      await axios.post(`${BACKEND}/accuracy`, { user_id: 'me', question_id: qid, correct }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Quiz</h2>
      <div className="space-y-4">
        {data.mcqs_json?.map((q, i)=> (
          <div key={`mcq-${i}`} className="p-4 rounded bg-zinc-900 border border-zinc-800">
            <div className="font-medium">{q.question || q.prompt || `Q${i+1}`}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(q.options || q.choices || []).map((opt, j)=> (
                <button key={j} className={`px-3 py-2 rounded ${answers[`mcq-${i}`] === (opt===q.answer) ? 'bg-green-600' : 'bg-zinc-800 hover:bg-zinc-700'}`} onClick={()=>answer(`mcq-${i}`, opt===q.answer)}>
                  {typeof opt === 'string' ? opt : JSON.stringify(opt)}
                </button>
              ))}
            </div>
            {q.explanation && <div className="text-sm text-zinc-300 mt-2">{q.explanation}</div>}
          </div>
        ))}
        {data.tf_json?.map((q, i)=> (
          <div key={`tf-${i}`} className="p-4 rounded bg-zinc-900 border border-zinc-800">
            <div className="font-medium">{q.statement || q.question || `Statement ${i+1}`}</div>
            <div className="mt-2 flex gap-2">
              {['True','False'].map((label)=> (
                <button key={label} className={`px-3 py-2 rounded ${answers[`tf-${i}`] === (label.toLowerCase()===String(q.answer).toLowerCase()) ? 'bg-green-600' : 'bg-zinc-800 hover:bg-zinc-700'}`} onClick={()=>answer(`tf-${i}`, label.toLowerCase()===String(q.answer).toLowerCase())}>{label}</button>
              ))}
            </div>
            {q.reason && <div className="text-sm text-zinc-300 mt-2">{q.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FlashPage() {
  const { token } = useAuthToken()
  const [cards, setCards] = useState([])
  const [idx, setIdx] = useState(0)
  const [flip, setFlip] = useState(false)
  const id = location.pathname.split('/').pop()
  useEffect(()=>{
    axios.get(`${BACKEND}/flashcards/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>setCards(r.data.flashcards_json || []))
  },[id])

  const mark = (level) => {
    // basic spaced repetition stub; in real use store schedule
    setIdx((i)=> (i+1) % Math.max(1, cards.length))
    setFlip(false)
  }

  const card = cards[idx] || {}

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Flashcards</h2>
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer" onClick={()=>setFlip(!flip)}>
        <div className="text-zinc-400 text-sm">Card {idx+1} / {cards.length}</div>
        <div className="text-xl mt-2">{!flip ? (card.q || card.question) : (card.a || card.answer)}</div>
      </div>
      <div className="mt-4 flex gap-2">
        {['easy','medium','hard'].map(l=> (
          <button key={l} onClick={()=>mark(l)} className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 capitalize">{l}</button>
        ))}
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes/:id" element={<NotesPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/flash/:id" element={<FlashPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
