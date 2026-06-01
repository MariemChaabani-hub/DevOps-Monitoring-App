import React from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AdminAuth from './components/AdminAuth';

function App() {
  return (
    <div className="App">
      <AdminAuth>
        <Dashboard />
      </AdminAuth>
    </div>
  );
}

export default App;