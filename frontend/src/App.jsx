import React, { useState } from 'react';
import './App.css';
import CompartmentBrowser from './components/CompartmentBrowser';
import PolicyDetail from './components/PolicyDetail';

function App() {
  // App state for page/tab and current policy
  const [tab, setTab] = useState('main'); // 'main' | 'policyDetail'
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // LIFT state from CompartmentBrowser for persistence on navigation
  const [selectedProfile, setSelectedProfile] = useState('');
  const [profileRootId, setProfileRootId] = useState('');
  const [compartmentStack, setCompartmentStack] = useState([]);

  // Open policy detail tab
  function handlePolicyClick(policy) {
    setSelectedPolicy(policy);
    setTab('policyDetail');
  }

  // Back to compartments tab
  function handleBack() {
    setSelectedPolicy(null);
    setTab('main');
  }

  return (
    <div className="app-container">
      {tab === 'main' && (
        <CompartmentBrowser
          onPolicyClick={handlePolicyClick}
          selectedProfile={selectedProfile}
          setSelectedProfile={setSelectedProfile}
          compartmentStack={compartmentStack}
          setCompartmentStack={setCompartmentStack}
          profileRootId={profileRootId}
          setProfileRootId={setProfileRootId}
        />
      )}
      {tab === 'policyDetail' && selectedPolicy && (
        <PolicyDetail policy={selectedPolicy} onBack={handleBack} />
      )}
    </div>
  );
}

export default App;
