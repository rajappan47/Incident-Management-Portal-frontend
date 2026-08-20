import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { IncidentProvider, useIncidentsContext } from '../../context/IncidentContext';

// Helper component to consume context and expose state & triggers
const TestConsumer = () => {
  const context = useIncidentsContext();

  // Safety check for rendering test
  if (!context) {
    return <div data-testid="no-context">No Context Available</div>;
  }

  const { incidents, setIncidents, filters, setFilters } = context;

  return (
    <div>
      <div data-testid="incidents-count">{incidents.length}</div>
      <div data-testid="incidents-list">
        {incidents.map((inc) => (
          <span key={inc.id} data-testid={`incident-${inc.id}`}>
            {inc.title}
          </span>
        ))}
      </div>
      <div data-testid="filters">{JSON.stringify(filters)}</div>

      <button
        onClick={() =>
          setIncidents([
            { id: 1, title: 'Server Outage' },
            { id: 2, title: 'Database Lag' },
          ])
        }
      >
        Set Incidents
      </button>

      <button onClick={() => setFilters({ priority: 'High', status: 'Open' })}>
        Set Filters
      </button>

      <button
        onClick={() =>
          setIncidents((prev) => [...prev, { id: 3, title: 'Network Spike' }])
        }
      >
        Append Incident
      </button>
    </div>
  );
};

describe('IncidentContext & useIncidentsContext', () => {
  it('provides correct default initial state', () => {
    render(
      <IncidentProvider>
        <TestConsumer />
      </IncidentProvider>
    );

    expect(screen.getByTestId('incidents-count')).toHaveTextContent('0');
    expect(screen.getByTestId('filters')).toHaveTextContent('{}');
  });

  it('updates incidents state when setIncidents is called', () => {
    render(
      <IncidentProvider>
        <TestConsumer />
      </IncidentProvider>
    );

    const setIncidentsButton = screen.getByRole('button', { name: /set incidents/i });

    act(() => {
      setIncidentsButton.click();
    });

    expect(screen.getByTestId('incidents-count')).toHaveTextContent('2');
    expect(screen.getByTestId('incident-1')).toHaveTextContent('Server Outage');
    expect(screen.getByTestId('incident-2')).toHaveTextContent('Database Lag');
  });

  it('updates filters state when setFilters is called', () => {
    render(
      <IncidentProvider>
        <TestConsumer />
      </IncidentProvider>
    );

    const setFiltersButton = screen.getByRole('button', { name: /set filters/i });

    act(() => {
      setFiltersButton.click();
    });

    expect(screen.getByTestId('filters')).toHaveTextContent(
      JSON.stringify({ priority: 'High', status: 'Open' })
    );
  });

  it('supports functional updates for state updaters', () => {
    render(
      <IncidentProvider>
        <TestConsumer />
      </IncidentProvider>
    );

    const setIncidentsButton = screen.getByRole('button', { name: /set incidents/i });
    const appendIncidentButton = screen.getByRole('button', { name: /append incident/i });

    // Initial populate
    act(() => {
      setIncidentsButton.click();
    });

    // Append using functional updater
    act(() => {
      appendIncidentButton.click();
    });

    expect(screen.getByTestId('incidents-count')).toHaveTextContent('3');
    expect(screen.getByTestId('incident-3')).toHaveTextContent('Network Spike');
  });

  it('returns undefined when useIncidentsContext is used outside IncidentProvider', () => {
    render(<TestConsumer />);

    expect(screen.getByTestId('no-context')).toBeInTheDocument();
  });
});