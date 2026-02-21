import React, { createContext, useContext, useState, useEffect } from 'react';

const FeatureFlagContext = createContext({});

export function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState({
    flights_enabled: true,
    hotels_enabled: true,
    activities_enabled: true,
    transport_enabled: true,
    documents_enabled: true,
    sms_enabled: false,
    email_enabled: false,
    social_enabled: true,
  });

  useEffect(() => {
    fetch('/api/feature-flags')
      .then(r => r.json())
      .then(setFlags)
      .catch(() => {});
  }, []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
