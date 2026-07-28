import { render } from '@testing-library/react-native';

import { AircraftHeroPhoto } from '../AircraftHeroPhoto';

// Covers issue #35's hero photo acceptance criteria: renders the real photo
// when the aircraft has one, and falls back to a placeholder (never blank)
// when `primary_photo_url` is null — the empty-state guidance itself is
// onboarding's job, not this component's.
describe('AircraftHeroPhoto', () => {
  it('renders the photo when a photoUrl is present', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <AircraftHeroPhoto photoUrl="https://example.com/n123az.jpg" registration="N123AZ" />,
    );

    expect(getByLabelText('Photo of N123AZ')).toBeTruthy();
    expect(queryByLabelText('No photo yet for N123AZ')).toBeNull();
  });

  it('renders a placeholder, not a blank space, when there is no photo yet', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <AircraftHeroPhoto photoUrl={null} registration="N123AZ" />,
    );

    expect(getByLabelText('No photo yet for N123AZ')).toBeTruthy();
    expect(queryByLabelText('Photo of N123AZ')).toBeNull();
  });
});
