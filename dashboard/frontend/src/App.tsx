import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './App.css';

interface ExecutionStep {
  sessionId: string;
  stepId: string;
  action: string;
  status: 'COMPLETED' | 'FAILED' | 'STARTED';
  screenshot?: string;
  error?: string;
  timestamp: string;
  description?: string;
}

const BACKEND_URL = 'http://localhost:3001';

function App() {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Fetch initial history
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/history`);
        setSteps(response.data.reverse()); // Newest first
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };

    fetchHistory();

    // Setup Socket.io
    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to dashboard backend');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('execution_event', (event: any) => {
      console.log('Received event:', event);
      if (event.type === 'STEP_COMPLETED' || event.type === 'STEP_STARTED') {
        const newStep = event.payload;
        setSteps((prev) => {
          // If it's a completion, update the existing "STARTED" step or add it
          const existingIndex = prev.findIndex(s => s.stepId === newStep.stepId && s.sessionId === newStep.sessionId);
          if (existingIndex !== -1) {
            const updatedSteps = [...prev];
            updatedSteps[existingIndex] = { ...updatedSteps[existingIndex], ...newStep };
            return updatedSteps;
          }
          return [newStep, ...prev];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>Execution Dashboard</h1>
        <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Real-time Connected' : 'Disconnected'}
        </div>
      </header>

      <main>
        <table className="execution-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Session ID</th>
              <th>Step ID</th>
              <th>Action</th>
              <th>Status</th>
              <th>Screenshot</th>
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No execution data available.
                </td>
              </tr>
            ) : (
              steps.map((step, index) => (
                <tr key={`${step.sessionId}-${step.stepId}-${index}`} className={step.status.toLowerCase()}>
                  <td className="time">{new Date(step.timestamp).toLocaleTimeString()}</td>
                  <td className="session">{step.sessionId}</td>
                  <td className="step">{step.stepId}</td>
                  <td className="action">{step.action}</td>
                  <td className={`status`}>
                    <span className={`badge ${step.status.toLowerCase()}`}>
                      {step.status}
                    </span>
                    {step.error && <div className="error-msg">{step.error}</div>}
                  </td>
                  <td className="screenshot">
                    {step.screenshot ? (
                      <a href={`${BACKEND_URL}/artifacts/${step.screenshot}`} target="_blank" rel="noreferrer">
                        <img 
                          src={`${BACKEND_URL}/artifacts/${step.screenshot}`} 
                          alt="Step screenshot" 
                          className="preview-img"
                        />
                      </a>
                    ) : (
                      <span className="no-img">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default App;
