import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          Host hackathons. <span className="grad">Join with a code.</span>
        </h1>
        <p>
          Makers create hackathons and get a private join code. Participants enter the code,
          build their project, and submit — all in one place.
        </p>
        <div className="hero-actions">
          <Link href="/register" className="btn">Get started</Link>
          <Link href="/hackathons" className="btn secondary">Explore hackathons</Link>
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>🛠 For makers</h3>
          <p className="desc">List a hackathon, set dates, prizes and limits. Share the auto-generated code and track participants.</p>
        </div>
        <div className="card">
          <h3>🔑 Join with a code</h3>
          <p className="desc">Participants enter the 6-character code from the maker to get inside a hackathon.</p>
        </div>
        <div className="card">
          <h3>🚀 Submit &amp; get scored</h3>
          <p className="desc">Participants submit repo and demo links. Makers review, score and leave feedback.</p>
        </div>
      </section>
    </>
  );
}
