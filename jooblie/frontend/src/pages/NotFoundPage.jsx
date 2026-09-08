import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <Reveal>
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <Link className="button button--primary" to="/">Back to Jooblie</Link>
      </Reveal>
    </section>
  );
}
