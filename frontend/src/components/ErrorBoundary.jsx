import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      const chunk = /Loading chunk|dynamically imported module|Failed to fetch/i.test(String(this.state.error?.message));
      return (
        <div className="container-page py-24 text-center">
          <h1 className="text-2xl font-bold">{chunk ? 'A new version is available' : 'Something went wrong'}</h1>
          <p className="text-ink-2 mt-2">{chunk ? 'Please reload the page to continue.' : 'Please reload the page. If this keeps happening, contact support.'}</p>
          <button className="btn btn-primary mt-6" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
