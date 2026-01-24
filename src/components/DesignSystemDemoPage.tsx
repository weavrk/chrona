import { useState } from 'react';
import '../styles/design-system.css';

export function DesignSystemDemoPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Blank page with background-body color - everything else happens in the drawer */}
      
      {/* Design System Toggle Button */}
      <button
        className="design-system-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open Design System"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>

      {/* Design System Overlay */}
      {isOpen && (
        <>
          <div className="design-system-overlay" onClick={() => setIsOpen(false)} />
          <div className="design-system-panel">
            <div className="design-system-header">
              <h2 className="page-header">Design System</h2>
              <button
                className="design-system-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="design-system-content">
              <div className="design-system-scrollable">
                {/* Primitive Colors Section */}
                <section className="design-system-section">
                  <h3 className="section-header">Primitive Colors</h3>
                  <div className="color-grid">
                    {/* Gray Scale */}
                    {[
                      { name: 'gray-100', value: '#141414' },
                      { name: 'gray-200', value: '#1A1A1A' },
                      { name: 'gray-300', value: '#2a2a2a' },
                      { name: 'gray-400', value: '#6B6B6B' },
                      { name: 'gray-500', value: '#808080' },
                      { name: 'gray-600', value: '#999999' },
                      { name: 'gray-700', value: '#B3B3B3' },
                      { name: 'gray-800', value: '#CCCCCC' },
                      { name: 'gray-900', value: '#FFFFFF' },
                    ].map((color) => (
                      <div key={color.name} className="color-swatch-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span className="color-name">{color.name}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(color.name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-secondary)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s'
                            }}
                            title="Copy to clipboard"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                        <input
                          type="color"
                          className="color-swatch"
                          value={color.value}
                          readOnly
                        />
                        <div className="color-info">
                          <input
                            type="text"
                            className="color-hex"
                            value={color.value}
                            readOnly
                          />
                        </div>
                      </div>
                    ))}

                    {/* CMYK Colors */}
                    {[
                      { name: 'cyan-light', value: '#7EC8E3' },
                      { name: 'cyan-dark', value: '#4A90E2' },
                      { name: 'magenta-light', value: '#F06292' },
                      { name: 'magenta-dark', value: '#D81B60' },
                      { name: 'yellow-light', value: '#FFD54F' },
                      { name: 'yellow-dark', value: '#FFA000' },
                    ].map((color) => (
                      <div key={color.name} className="color-swatch-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span className="color-name">{color.name}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(color.name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-secondary)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s'
                            }}
                            title="Copy to clipboard"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                        <input
                          type="color"
                          className="color-swatch"
                          value={color.value}
                          readOnly
                        />
                        <div className="color-info">
                          <input
                            type="text"
                            className="color-hex"
                            value={color.value}
                            readOnly
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add Button */}
                    <div
                      className="color-swatch-card"
                      style={{
                        cursor: 'pointer',
                        border: '2px solid var(--color-secondary)',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '120px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-secondary)' }}>
                        <path d="M12 5v14M5 12h14"></path>
                      </svg>
                      <span style={{ fontFamily: 'var(--font-family)', fontSize: '0.875rem', color: 'var(--color-secondary)' }}>Add</span>
                    </div>
                  </div>
                </section>

                {/* Semantic Colors Section */}
                <section className="design-system-section">
                  <h3 className="section-header">Semantic Colors</h3>
                  <div className="semantic-colors-list">
                    {[
                      { name: 'brand-primary', color: '#7EC8E3', primitive: 'cyan-light' },
                      { name: 'primary', color: '#FFFFFF', primitive: 'gray-900' },
                      { name: 'secondary', color: '#6B6B6B', primitive: 'gray-400' },
                      { name: 'tertiary', color: '#1A1A1A', primitive: 'gray-200' },
                      { name: 'accent', color: '#7EC8E3', primitive: 'cyan-light' },
                      { name: 'accent-2', color: '#F06292', primitive: 'magenta-light' },
                      { name: 'accent-3', color: '#FFD54F', primitive: 'yellow-light' },
                      { name: 'button-primary', color: '#2a2a2a', primitive: 'gray-300' },
                      { name: 'background-body', color: '#141414', primitive: 'gray-100' },
                      { name: 'background-shells', color: '#1A1A1A', primitive: 'gray-200' },
                      { name: 'background-components', color: '#2a2a2a', primitive: 'gray-300' },
                      { name: 'background-footer', color: '#1A1A1A', primitive: 'gray-200' },
                      { name: 'background-white', color: '#FFFFFF', primitive: 'gray-900' },
                    ].map((semantic) => (
                      <div key={semantic.name}>
                        <div className="semantic-color-item" style={{ opacity: 1, borderTop: 'none', padding: '8px', gap: '16px' }}>
                          <div className="semantic-color-preview" style={{ backgroundColor: semantic.color }}></div>
                          <div className="semantic-color-info" style={{ flex: '1 1 0%', padding: '0px', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <span className="semantic-color-label" style={{ cursor: 'text' }}>{semantic.name}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(semantic.name)}
                                title="Copy to clipboard"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                            <select className="semantic-color-select" value={semantic.primitive} disabled>
                              <option value="gray-100">gray-100</option>
                              <option value="gray-200">gray-200</option>
                              <option value="gray-300">gray-300</option>
                              <option value="gray-400">gray-400</option>
                              <option value="gray-500">gray-500</option>
                              <option value="gray-600">gray-600</option>
                              <option value="gray-700">gray-700</option>
                              <option value="gray-800">gray-800</option>
                              <option value="gray-900">gray-900</option>
                              <option value="cyan-light">cyan-light</option>
                              <option value="cyan-dark">cyan-dark</option>
                              <option value="magenta-light">magenta-light</option>
                              <option value="magenta-dark">magenta-dark</option>
                              <option value="yellow-light">yellow-light</option>
                              <option value="yellow-dark">yellow-dark</option>
                            </select>
                          </div>
                          <div
                            draggable
                            title="Drag to reorder"
                            style={{
                              color: 'var(--color-secondary)',
                              cursor: 'grab',
                              padding: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s',
                              userSelect: 'none'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="9" cy="5" r="1"></circle>
                              <circle cx="9" cy="12" r="1"></circle>
                              <circle cx="9" cy="19" r="1"></circle>
                              <circle cx="15" cy="5" r="1"></circle>
                              <circle cx="15" cy="12" r="1"></circle>
                              <circle cx="15" cy="19" r="1"></circle>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Button */}
                    <div
                      className="semantic-color-item"
                      style={{
                        cursor: 'pointer',
                        border: '2px solid var(--color-secondary)',
                        background: 'transparent',
                        padding: '0px',
                        gap: '16px',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', flexShrink: 0 }}></div>
                      <div className="semantic-color-info" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-secondary)', padding: '0px', width: '100%' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        <span style={{ fontFamily: 'var(--font-family)', fontSize: '0.875rem' }}>Add</span>
                      </div>
                      <div style={{ width: '32px', flexShrink: 0 }}></div>
                    </div>
                  </div>
                </section>

                {/* Button Components Section */}
                <section className="design-system-section">
                  <h3 className="section-header">Button Components</h3>
                  <div className="button-components-demo">
                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-primary</h4>
                      <button className="ds-button-primary">Save</button>
                      <p className="button-demo-description">Full-width button with neumorphic styling. Used for primary actions like saving profiles.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-destructive</h4>
                      <button className="ds-button-destructive">Delete Profile</button>
                      <p className="button-demo-description">Button with built-in "Are you sure?" confirmation. Used for destructive actions like deleting profiles.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-secondary</h4>
                      <button className="ds-button-secondary">Cancel</button>
                      <p className="button-demo-description">Customizable button with same attributes as primary. Colors can be customized in the future.</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Bottom Actions Sheet */}
              <div className="design-system-actions-bottom-sheet">
                <button className="create-button-full">Apply Changes</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

