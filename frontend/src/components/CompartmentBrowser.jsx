import React, { useState, useEffect } from 'react';
import PolicyTable from './PolicyTable';

// Backend API root - configurable with VITE_BACKEND_URL, defaults to localhost:3001 for local development
const API_ROOT = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * CompartmentBrowser component
 * Handles compartment drilldown navigation, loading profiles, fetches policies, and passes policy data to PolicyTable.
 * Props:
 *   onPolicyClick(policy): callback when a policy name is clicked.
 */
function CompartmentBrowser({
  onPolicyClick,
  selectedProfile,
  setSelectedProfile,
  compartmentStack,
  setCompartmentStack,
  profileRootId,
  setProfileRootId
}) {
// State: List of available OCI profiles
  const [profiles, setProfiles] = useState([]);
// State: List of sub-compartments for the current profile/context
  const [compartments, setCompartments] = useState([]);
// State: List of policies in the selected compartment
  const [policies, setPolicies] = useState([]);
// State: Whether the profiles are currently being loaded
  const [loadingProfiles, setLoadingProfiles] = useState(false);
// State: Whether the compartments are being loaded
  const [loadingCompartments, setLoadingCompartments] = useState(false);
// State: Whether the policies are being loaded
  const [loadingPolicies, setLoadingPolicies] = useState(false);
// State: Current error message (if any)
  const [error, setError] = useState('');

  useEffect(() => {
    setLoadingProfiles(true);
    fetch(`${API_ROOT}/api/profiles`)
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data.profiles || []);
        setLoadingProfiles(false);
      })
      .catch(() => {
        setError('Could not load profiles.');
        setLoadingProfiles(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      setCompartmentStack([]);
      fetchChildren('', true);
    } else {
      setCompartments([]);
      setPolicies([]);
      setCompartmentStack([]);
      setProfileRootId('');
    }
    // eslint-disable-next-line
  }, [selectedProfile]);

// ID of current compartment (root if stack is empty)
  const currentCompartmentId =
    compartmentStack.length === 0
      ? profileRootId
      : compartmentStack[compartmentStack.length - 1].id;
// Name of current compartment (root if stack is empty)
  const currentCompartmentName =
    compartmentStack.length === 0
      ? '(Tenancy Root)'
      : compartmentStack[compartmentStack.length - 1].name;

  // Fetches and sets sub-compartments for a parent compartment, and can set compartment root ID if required
  const fetchChildren = (parentId = '', setRootId = false) => {
    if (!selectedProfile) return;
    setLoadingCompartments(true);
    setError('');
    let url = `${API_ROOT}/api/compartments?profile=${encodeURIComponent(selectedProfile)}`;
    if (parentId) url += `&parent=${encodeURIComponent(parentId)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompartments(data);
          if (setRootId && data.length > 0 && data[0].compartmentId) {
            setProfileRootId(data[0].compartmentId);
          }
          fetchPolicies(
            setRootId && data.length > 0 && data[0].compartmentId
              ? data[0].compartmentId
              : parentId
          );
        } else {
          setError(data.error || 'Unexpected response');
          setCompartments([]);
        }
        setLoadingCompartments(false);
      })
      .catch(() => {
        setError('Failed to load compartments.');
        setCompartments([]);
        setLoadingCompartments(false);
      });
  };

  // Fetches and sets list of policies for a given compartment
  const fetchPolicies = (compartmentId) => {
    if (!selectedProfile || !compartmentId) {
      setPolicies([]);
      return;
    }
    setLoadingPolicies(true);
    setError('');
    fetch(
      `${API_ROOT}/api/policies?profile=${encodeURIComponent(
        selectedProfile
      )}&compartmentId=${encodeURIComponent(compartmentId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPolicies(data);
        } else {
          setError(data.error || 'Unexpected response');
          setPolicies([]);
        }
        setLoadingPolicies(false);
      })
      .catch(() => {
        setError('Failed to load policies.');
        setPolicies([]);
        setLoadingPolicies(false);
      });
  };

  // Handles navigation into a sub-compartment (drilldown)
  const handleDrilldown = (c) => {
    setCompartmentStack([...compartmentStack, { id: c.id, name: c.name }]);
    fetchChildren(c.id);
    fetchPolicies(c.id);
  };

  // Handles navigation backwards (up) one level in compartmentStack
  const handleBack = () => {
    const newStack = compartmentStack.slice(0, -1);
    setCompartmentStack(newStack);
    const parentId =
      newStack.length === 0 ? profileRootId : newStack[newStack.length - 1].id;
    fetchChildren(parentId);
    fetchPolicies(parentId);
  };

  // Handles profile <select> dropdown change event
  const handleProfileChange = (e) => {
    const profile = e.target.value;
    setSelectedProfile(profile);
    setCompartments([]);
    setPolicies([]);
    setCompartmentStack([]);
    setProfileRootId('');
  };

  return (
    <div>
      <h1>OCI Compartment and Policy Browser</h1>
      {loadingProfiles ? (
        <p>Loading OCI profiles…</p>
      ) : (
        <div>
          <label htmlFor="profile">Select OCI Profile: </label>
          <select
            id="profile"
            value={selectedProfile}
            onChange={handleProfileChange}
          >
            <option value="">-- Select --</option>
            {profiles.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProfile && (
        <div>
          <hr />
          <div>
            <b>Current:</b>{" "}
            {compartmentStack.length === 0
              ? "(Tenancy Root)"
              : compartmentStack.map((c) => c.name).join(" / ")}
          </div>
          {compartmentStack.length > 0 && (
            <button onClick={handleBack} style={{ margin: '8px 0' }}>Back</button>
          )}
        </div>
      )}

      {selectedProfile && loadingCompartments && <p>Loading compartments…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {selectedProfile && !loadingCompartments && (
        <div>
          <h2>Sub-Compartments</h2>
          <table className="compartment-table">
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Description</th>
              </tr>
            </thead>
            <tbody>
              {compartments.length === 0 ? (
                <tr>
                  <td colSpan={2}>No sub-compartments found.</td>
                </tr>
              ) : (
                compartments.map((c) => (
                  <tr key={c.id} style={{ cursor: "pointer" }}>
                    <td
                      style={{ textDecoration: "underline", color: "#1a0dab" }}
                      onClick={() => handleDrilldown(c)}
                      align="left"
                    >
                      <strong>{c.name}</strong>
                    </td>
                    <td align="left">{c.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProfile && (
        <div>
          <h2>Policies for: {currentCompartmentName}</h2>
          {loadingPolicies && <p>Loading policies…</p>}
          {!loadingPolicies && (
            <PolicyTable
              policies={policies}
              onPolicyClick={onPolicyClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default CompartmentBrowser;