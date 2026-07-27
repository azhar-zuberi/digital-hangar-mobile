import { render } from '@testing-library/react-native';

import { PlaceholderScreen } from '../PlaceholderScreen';

// Component test example for issue #12. PlaceholderScreen backs the Care and
// Fly tabs (issue #10) before their real content lands in Phases 3-4, so
// this is a small, real piece of Phase 1 UI rather than a throwaway
// fixture — it guards the "calm over complexity" shell (icon, title, one
// line of copy, nothing more) against regressions as those tabs grow.
describe('PlaceholderScreen', () => {
  it('renders the title and message copy passed in', async () => {
    const { getByText } = await render(
      <PlaceholderScreen
        title="Care"
        message="Maintenance, squawks, and reminders land here."
        symbol="wrench.and.screwdriver"
        symbolFallback="🔧"
      />,
    );

    expect(getByText('Care')).toBeTruthy();
    expect(getByText('Maintenance, squawks, and reminders land here.')).toBeTruthy();
  });

  it('renders distinct copy per tab, so Care and Fly are not accidentally sharing content', async () => {
    const { getByText, queryByText } = await render(
      <PlaceholderScreen
        title="Fly"
        message="Flights, hours, and routes land here."
        symbol="airplane"
        symbolFallback="✈️"
      />,
    );

    expect(getByText('Fly')).toBeTruthy();
    expect(getByText('Flights, hours, and routes land here.')).toBeTruthy();
    expect(queryByText('Maintenance, squawks, and reminders land here.')).toBeNull();
  });
});
