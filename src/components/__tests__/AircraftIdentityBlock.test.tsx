import { render } from '@testing-library/react-native';

import { AircraftIdentityBlock } from '../AircraftIdentityBlock';

// Covers issue #35's identity block acceptance criteria: tail number,
// make/model, and an optional nickname line, all pulled straight from props
// (no placeholder copy, per BRAND.md §17).
describe('AircraftIdentityBlock', () => {
  it('renders the tail number and make/model', async () => {
    const { getByText, queryByText } = await render(
      <AircraftIdentityBlock
        registration="N123AZ"
        manufacturer="Piper"
        model="PA-38 Tomahawk"
        nickname={null}
      />,
    );

    expect(getByText('N123AZ')).toBeTruthy();
    expect(getByText('Piper PA-38 Tomahawk')).toBeTruthy();
    expect(queryByText(/"/)).toBeNull();
  });

  it('renders the nickname line when present', async () => {
    const { getByText } = await render(
      <AircraftIdentityBlock
        registration="N123AZ"
        manufacturer="Piper"
        model="PA-38 Tomahawk"
        nickname="Tommy"
      />,
    );

    expect(getByText('"Tommy"')).toBeTruthy();
  });

  it('omits the nickname line entirely when there is none', async () => {
    const { queryByText } = await render(
      <AircraftIdentityBlock
        registration="N456BZ"
        manufacturer="Cessna"
        model="172 Skyhawk"
        nickname={null}
      />,
    );

    expect(queryByText('"Tommy"')).toBeNull();
  });
});
