export default function PageHead({ eyebrow, title, children }) {
  return (
    <section className="phead">
      <div className="container">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  )
}
