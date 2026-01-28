import React from 'react';

/**
 * PolicyTable component
 * Displays a table of policies (name, description).
 * Props:
 *   policies: array of policy objects (each must have 'id', 'name', 'description', and optionally 'statements')
 *   onPolicyClick(policy): callback when a policy name is clicked
 */
function PolicyTable({ policies, onPolicyClick }) {
  if (!policies || policies.length === 0) {
    return <p>No policies found.</p>;
  }

  return (
    <table className="policy-table">
      <thead>
        <tr>
          <th align="left">Policy Name</th>
          <th align="left">Description</th>
        </tr>
      </thead>
      <tbody>
        {policies.map((p) => (
          <tr key={p.id}>
            <td align="left">
              <span
                style={{ textDecoration: 'underline', color: '#1a0dab', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => onPolicyClick(p)}
              >
                {p.name}
              </span>
            </td>
            <td align="left">{p.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PolicyTable;