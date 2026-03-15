import { render } from '@testing-library/react';
import { Sparkline } from '@/components/Sparkline';

describe('Sparkline', () => {
  it('renders null when data has fewer than 2 points', () => {
    const { container } = render(<Sparkline data={[100]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null when data is empty', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders an SVG with a polyline element when given 5+ data points', () => {
    const data = [100, 102, 101, 105, 103];
    const { container } = render(<Sparkline data={data} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const polyline = svg?.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
  });

  it('polyline points attribute contains comma-separated coordinates', () => {
    const data = [10, 20, 15, 25, 30];
    const { container } = render(<Sparkline data={data} />);
    const polyline = container.querySelector('polyline');
    const points = polyline?.getAttribute('points') ?? '';
    // Points should be "x,y x,y x,y ..." format -- each pair is comma-separated
    const pairs = points.trim().split(' ');
    expect(pairs.length).toBe(data.length);
    pairs.forEach((pair) => {
      const parts = pair.split(',');
      expect(parts.length).toBe(2);
      expect(Number(parts[0])).not.toBeNaN();
      expect(Number(parts[1])).not.toBeNaN();
    });
  });

  it('respects custom width and height props', () => {
    const data = [10, 20, 30];
    const { container } = render(<Sparkline data={data} width={120} height={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('renders with 2 data points (minimum)', () => {
    const data = [100, 200];
    const { container } = render(<Sparkline data={data} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const polyline = svg?.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
  });

  it('uses default color #209dd7', () => {
    const data = [10, 20, 30];
    const { container } = render(<Sparkline data={data} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#209dd7');
  });

  it('uses custom color when provided', () => {
    const data = [10, 20, 30];
    const { container } = render(<Sparkline data={data} color="#ff0000" />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#ff0000');
  });
});
