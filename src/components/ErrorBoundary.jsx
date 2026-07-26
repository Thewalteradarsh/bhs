import React from 'react';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    const isNative = window.Capacitor?.isNative;
    if (isNative) {
      FirebaseCrashlytics.recordException({
        message: error.message || 'React Error Boundary Caught',
        stacktrace: error.stack || ''
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', zIndex: 9999, position: 'relative', background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h1>App Crashed</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'Unknown Error'}
          </pre>
          <p>Check the console for more details.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', marginTop: '20px', background: 'white', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
