import Link from 'next/link'
import { wa } from '../lib/utils'

export default function Done({ d }) {
  return (
    <div className="done">
      {d.pending ? (
        <div className="pend-ic" aria-hidden="true">⏳</div>
      ) : (
        <svg className="tick" viewBox="0 0 52 52" aria-hidden="true"><circle className="c" cx="26" cy="26" r="24" /><path className="k" d="M15 27l8 8 15-17" /></svg>
      )}
      <h2>{d.title}</h2>
      <p className="mut">{d.text}</p>
      <div className="card">
        {d.rows.map(([k, v]) => (<div className="kv" key={k}><span>{k}</span><b>{v}</b></div>))}
        <p className="note" style={{ margin: '10px 0 0' }}>Reference: {d.ref}</p>
      </div>
      <a className="btn" href={wa(d.msg)} target="_blank" rel="noopener noreferrer">Send details on WhatsApp</a>
      <Link className="btn ghost" href="/account">View in my account</Link>
    </div>
  )
}
