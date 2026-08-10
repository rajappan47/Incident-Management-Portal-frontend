import React, { createContext, useContext, useState } from 'react';

const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({});

  return (
    <IncidentContext.Provider value={{ incidents, setIncidents, filters, setFilters }}>
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidentsContext = () => useContext(IncidentContext);