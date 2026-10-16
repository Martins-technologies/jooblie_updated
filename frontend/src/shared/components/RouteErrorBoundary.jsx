import { Component } from 'react';
import { showErrorToast } from '../lib/toast';

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Route rendering failed', error, info);
    showErrorToast('This page could not be displayed. Reload the page and try again.');
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="route-fallback" role="alert">
          <div className="route-fallback__card">
            <span className="route-fallback__mark">J</span>
            <h1>This page could not be displayed</h1>
            <p>Please reload the page or return to the Jooblie home page.</p>
            <div className="route-fallback__actions">
              <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a className="button button--secondary" href="/">Go to home</a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
