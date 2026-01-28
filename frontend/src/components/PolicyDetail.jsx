import React from 'react';

/**
 * PolicyDetail component
 * Displays a policy's name, description, and statements.
 * Props:
 *   policy: policy object with 'name', 'description', 'statements' (array)
 *   onBack(): callback for navigating back to main view
 */
function PolicyDetail({ policy, onBack }) {
  if (!policy) {
    return (
      <div>
        <p>No policy selected.</p>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16 }}>Back</button>
      <h2>{policy.name}</h2>
      <p><b>Description:</b> {policy.description || '(No description)'}</p>
      <h3>Statements</h3>
      {Array.isArray(policy.statements) && policy.statements.length > 0 ? (
        <ul>
          {policy.statements.map((stmt, i) => (
            <li key={i}>
              <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{stmt}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No statements found.</p>
      )}
    </div>
  );
}

export default PolicyDetail;