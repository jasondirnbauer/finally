// Manual mock for lightweight-charts (ESM-only package, not resolvable in Jest CJS)
const mockSetData = jest.fn();
const mockUpdate = jest.fn();
const mockFitContent = jest.fn();

const mockSeries = {
  setData: mockSetData,
  update: mockUpdate,
};

const mockChart = {
  addSeries: jest.fn(() => mockSeries),
  applyOptions: jest.fn(),
  timeScale: jest.fn(() => ({ fitContent: mockFitContent })),
  remove: jest.fn(),
};

export const createChart = jest.fn(() => mockChart);
export const LineSeries = 'LineSeries';
export const ColorType = { Solid: 'Solid' };

// Expose internals for test assertions
export const __mockChart = mockChart;
export const __mockSeries = mockSeries;
