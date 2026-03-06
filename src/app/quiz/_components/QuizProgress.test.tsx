import { render, screen } from '@testing-library/react';
import { QuizProgress } from './QuizProgress';

describe('QuizProgress', () => {
  it('renders "Step 1 of 6" for currentStep=0, totalSteps=6', () => {
    render(<QuizProgress currentStep={0} totalSteps={6} />);
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('renders "Step 3 of 6" for currentStep=2, totalSteps=6', () => {
    render(<QuizProgress currentStep={2} totalSteps={6} />);
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
  });

  it('renders the correct number of dots (6)', () => {
    const { container } = render(<QuizProgress currentStep={0} totalSteps={6} />);
    // Dots are aria-hidden divs inside the progressbar
    const progressbar = container.querySelector('[role="progressbar"]');
    const dots = progressbar?.querySelectorAll('[aria-hidden="true"]');
    expect(dots).toHaveLength(6);
  });

  it('active dot has bg-primary and w-4 classes', () => {
    const { container } = render(<QuizProgress currentStep={0} totalSteps={6} />);
    const progressbar = container.querySelector('[role="progressbar"]');
    const dots = progressbar?.querySelectorAll('[aria-hidden="true"]');
    // First dot should be the active one (index 0 === currentStep)
    expect(dots?.[0]).toHaveClass('bg-primary');
    expect(dots?.[0]).toHaveClass('w-4');
  });
});
